/* eslint no-console: ["error", { allow: ["warn", "error"] }] */
const { S3Client, GetObjectCommand, PutObjectCommand } = require("@aws-sdk/client-s3");
const items = require("./items");
const { genReply } = require("./replies");
const { random } = require("./utils");

const { login } = require("masto");
const {
  TWITTER_IDS: { BOUT_BOT_ID: boutBotId },
  REPLY_TYPES: {
    YOU_WIN,
    MOVE_SUCCESS,
    MOVE_FAILED,
    MOVE_INVALID,
    NO_MOVE,
    NEXT_TURN,
    TRY_AGAIN,
    YOU_LOSE,
  },
} = require("./constants");

const { NODE_ENV } = process.env;
const local = !NODE_ENV;
const dev = local || NODE_ENV === "development";

// Bout state lives in one JSON object in S3, not a database.
//
// The old Postgres schema was a single table, `bouts (bout_id, in_progress,
// player_data, tweet_id)`, read in full on every run with `SELECT *` and never
// joined against anything. That is a key-value store, so it is one object now.
// Supabase's free tier paused the project after a week idle and the bot died
// silently; S3 has no idle state to lose.
const S3_BUCKET = process.env.BOUT_BUCKET || "boutbot";
const S3_KEY = "bouts.json";
const s3 = new S3Client({});

// Loaded once per invocation, mutated by save(), written back once by flush().
// Batching matters: a read-modify-write per save would race with itself, and the
// whole point of one object is that a run commits atomically or not at all.
let bouts = [];
let dirty = false;

const loadBouts = async () => {
  if (local) return [];
  try {
    const res = await s3.send(
      new GetObjectCommand({ Bucket: S3_BUCKET, Key: S3_KEY })
    );
    bouts = JSON.parse(await res.Body.transformToString()) || [];
  } catch (err) {
    // First run has no object yet; anything else is worth knowing about, but an
    // empty board beats crashing before any reply goes out.
    if (err.name !== "NoSuchKey") console.error("bout load failed:", err.name);
    bouts = [];
  }
  return bouts;
};

// Upsert by bout_id. Undefined fields are left alone, so a caller that does not
// know a bout's tweet_id does not blank it.
const save = (row) => {
  if (local) return;
  const i = bouts.findIndex((b) => b.bout_id === row.bout_id);
  const next = i === -1 ? { bout_id: row.bout_id } : bouts[i];
  for (const [k, v] of Object.entries(row)) if (v !== undefined) next[k] = v;
  if (i === -1) bouts.push(next);
  dirty = true;
};

const flush = async () => {
  if (local || !dirty) return;
  await s3.send(
    new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: S3_KEY,
      Body: JSON.stringify(bouts, null, 2),
      ContentType: "application/json",
    })
  );
  dirty = false;
};

// Get an item
const getItem = () => {
  const itemList = Object.keys(items);
  return random(itemList);
};

// Determines if date passed in is over 1 week old
// - Used to detect whether a post is too old to respond to
// - Posts "expire" after one week
// - TODO: Time could be decreased since reponses should be instantaneous
const isOldMention = (createdAt) => {
  const createdDate = new Date(createdAt);
  const date = new Date();
  // If post is over 1 week old, return false
  return Math.floor((date - createdDate) / 86400000) > 7;
};

// Get bout players
// - First two players (mentioner & mentionee)
// - Excludes @bout_bot
const getBoutPlayers = (users) => {
  return users
    .filter((u) => u.id !== boutBotId && u.id_str !== boutBotId)
    .slice(0, 2);
};

// Gen bout ID from player IDs
// - Bout ID is user IDs sorted numerically
const getBoutId = (users) => {
  return getBoutPlayers(users)
    .map((u) => u.id)
    .sort()
    .join("-");
};

// Main game handling function...
async function handleMentions(bouts, mentions) {
  const replies = [];

  // Queue actionable mentions
  const queue = mentions.reduce((result, mention) => {
    const {
      createdAt,
      account: user,
      status: { content: text, id, mentions: userMentions },
    } = mention;
    // When not running locally, don't queue mentions over one week old
    if (isOldMention(createdAt) && !local) return result;

    // Get boutId (combined user ids)
    const boutId = getBoutId([user, ...userMentions]);

    // Get bout if exists
    const bout = bouts.find((b) => b.bout_id === boutId);

    if (bout) {
      const {
        in_progress: inProgress,
        tweet_id: postId,
        player_data: { players },
      } = bout;
      if (inProgress) {
        // Check if this users turn
        const userUp = players.find((player) => player.turn);
        if (user.id !== userUp.id_str) return result;
      } else if (id === postId) {
        // Not in progress, mention is from previous bout
        return result;
      }
    } else if (text.toLowerCase().indexOf("challenge") <= -1) {
      // No bout exists and this isn't a valid starting mention
      return result;
    }
    if (result[boutId]) {
      // If a mention has already been queued up, don't do it again
      return result;
    }

    // All clear, queue up this mention
    return { ...result, [boutId]: mention };
  }, {});

  console.warn("LOOP THRU QUEUE");
  console.warn("===============");

  Object.keys(queue).forEach((boutId) => {
    // Get user_id, created_id for current mention
    // TODO: delete text, screen_name
    const mention = queue[boutId];
    const {
      account: { acct: screenName, displayName: name, id: userIdStr },
      status: {
        content: text,
        id: mentionIdStr,
        mentions: userMentions,
        tags: hashtags,
      },
    } = mention;
    console.warn(boutId, `@${screenName} posted ${text}`);

    const bout = bouts.find((b) => b.bout_id === boutId); // Bout data
    const boutStart = text.toLowerCase().indexOf("challenge") > -1;

    if (bout && bout.in_progress) {
      const { players } = bout.player_data;
      console.warn(
        `${players[0].screen_name} (${players[0].item}) vs ${players[1].screen_name} (${players[1].item})`
      );

      const next = Object.assign({}, bout);

      const player = players.find((p) => p.turn);
      const { item, tweet_id: postId, strike } = player;

      if (mentionIdStr !== postId) {
        // Step 1. Start status
        let status = "";
        let inProgress = true;
        let moveSuccess = true;
        let ignoreStrike = false;

        // Step 2. Add move result
        players.forEach((id, p) => {
          const { turn, name: playerName } = players[p];
          // Assign tweet_id to player (stored as tweet_id in db)
          if (turn) {
            next.player_data.players[p].tweet_id = mentionIdStr;
          } else if (hashtags.length > 0) {
            // If not this player's turn, calc damage
            const attemptedMove = hashtags[0].name;
            const move = items[item].find(
              (m) => m.id === attemptedMove.toLowerCase()
            );
            // Only checks first hashtag
            if (move) {
              const { accuracy, minDamage: min, maxDamage: max } = move;
              if (Math.random() <= accuracy) {
                const damage =
                  Math.floor(Math.random() * (max - min + 1)) + min;
                next.player_data.players[p].health -= damage;
                const { health } = next.player_data.players[p];
                if (health <= 0) {
                  status += genReply(YOU_WIN);
                  inProgress = false;
                } else {
                  status += genReply(MOVE_SUCCESS, {
                    playerName,
                    damage,
                    health,
                  });
                }
              } else {
                status += genReply(MOVE_FAILED);
              }
            } else {
              status += genReply(MOVE_INVALID, { attemptedMove });
            }
          } else {
            status += genReply(NO_MOVE);
            moveSuccess = false;
          }
        });

        const nextTurn = moveSuccess || strike >= 3;

        // Step 3. Add next player action
        players.forEach((id, p) => {
          const { turn } = players[p];
          if (inProgress && nextTurn) {
            // Switch turn for every player
            next.player_data.players[p].turn = !turn;
          }
          if (!turn) {
            const { screen_name: nextPlayerName } = players[p];
            if (inProgress) {
              if (nextTurn) {
                status += genReply(NEXT_TURN, { nextPlayerName });
              } else {
                status += genReply(TRY_AGAIN, { nextPlayerName });
              }
            } else {
              status += genReply(YOU_LOSE, { nextPlayerName });
            }
          } else if (inProgress) {
            // Set strikes for current player
            if (nextTurn) {
              next.player_data.players[p].strike = 0;
            } else {
              next.player_data.players[p].strike += 1;
              if (
                next.player_data.players[p].strike &&
                next.player_data.players[p].strike < 3
              ) {
                ignoreStrike = true;
              }
            }
          } else {
            next.player_data = {};
          }
        });

        console.warn("Updating bout", boutId);
        save({
          bout_id: boutId,
          in_progress: inProgress,
          player_data: next.player_data,
        });

        if (dev) status += " (dev)";

        if (!ignoreStrike) replies.push({ status, mentionIdStr });
      } else {
        console.warn("This post is.. old.");
      }
    } else if (boutStart) {
      // NEW BOUT //
      console.warn("NEW BOUT");

      // Create array of everyone involved in bout
      // TODO: limit to 2 for now
      const players = getBoutPlayers([
        { screen_name: screenName, name, id_str: userIdStr },
        ...userMentions.map((m) => ({
          screen_name: m.acct,
          name: m.username,
          id_str: m.id,
        })), // TODO: Indices gets added here..
      ]);

      players.forEach((id, p) => {
        players[p].item = getItem();
        players[p].health = 12;
        players[p].tweet_id = !p ? mentionIdStr : "";
        players[p].turn = !p;
        players[p].strike = 0;
      });
      const playerData = { players };
      const inProgress = true;
      // Insert and update carried the same four fields in the same order, so the
      // upsert covers both and the `bout` check is no longer needed here.

      const getMove = (item) => {
        const move = random(items[item]);
        return move.id;
      };

      // Compose post
      const status =
        "Game on! You have " +
        `${players[0].item} (#${getMove(players[0].item)}). ` +
        `@${players[1].screen_name} has ${players[1].item} ` +
        `(#${getMove(players[1].item)}). ` +
        `Your move, @${players[0].screen_name}!${dev ? " (dev)" : ""}`;

      save({
        bout_id: boutId,
        in_progress: inProgress,
        player_data: playerData,
        tweet_id: mentionIdStr,
      });
      replies.push({ status, mentionIdStr });
    } else {
      console.warn("Not playing Bout (yet). Ignore.");
    }
    // Line break
    console.warn("");
  });

  return replies;
}

exports.handler = async (event) => {
  const masto = await login({
    url: process.env.MASTODON_URL,
    accessToken: process.env.MASTODON_ACCESS_TOKEN,
  });

  // Get mentions of @bout
  const posts = await masto.v1.notifications.list();

  // Gets bouts from S3
  const bouts = await loadBouts();

  // Go through posts and update db, returns post reply data
  const replies = await handleMentions(
    bouts,
    posts.filter((p) => p.type === "mention")
  );

  // Handle replies
  const createdPosts = await Promise.all(
    replies.map((reply) =>
      masto.v1.statuses.create({
        status: reply.status,
        inReplyToId: reply.mentionIdStr,
      })
    )
  );

  // Write once, after the replies are out. save() only touched memory.
  await flush();

  const response = {
    statusCode: 200,
    body: JSON.stringify(createdPosts),
  };

  return response;
};
