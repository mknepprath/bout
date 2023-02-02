/* eslint no-console: ["error", { allow: ["warn", "error"] }] */
const { Pool } = require("pg");
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

const { NODE_ENV, DATABASE_URL } = process.env;
const local = !NODE_ENV;
const dev = local || NODE_ENV === "development";

// Connect to database
const pool = new Pool({
  connectionString: `${DATABASE_URL}`,
  ssl: {
    rejectUnauthorized: false,
  },
});

// Query database
const save = (query, data) => {
  if (!local) {
    pool.query(query, data, (err) => {
      if (err) console.error(err);
    });
  }
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
        const updatedBout = [inProgress, next.player_data, boutId];

        const query =
          "UPDATE bouts SET in_progress = $1, player_data = $2 WHERE bout_id = $3";
        save(query, updatedBout);

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
      const query = bout
        ? "UPDATE bouts SET in_progress = $1, player_data = $2, tweet_id = $3 WHERE bout_id = $4"
        : "INSERT INTO bouts (in_progress, player_data, tweet_id, bout_id) values ($1, $2, $3, $4)";

      // Create bout array to store
      const newBout = [inProgress, playerData, mentionIdStr, boutId];

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

      save(query, newBout);
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

  // Gets bouts from database
  const bouts = await pool
    .query("SELECT * FROM bouts;")
    .then((response) => response.rows);

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

  const response = {
    statusCode: 200,
    body: JSON.stringify(createdPosts),
  };

  return response;
};
