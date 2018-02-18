/* eslint no-console: ["error", { allow: ["warn", "error"] }] */

const TwitterPackage = require('twitter')
const pg = require('pg')
const testMentions = require('./test_mentions')
const testBouts = require('./test_bouts')
const items = require('./items')
const conditions = require('./conditions')
const { genReply } = require('./replies')
const { random } = require('./utils')
const {
  TWITTER_IDS: {
    BOUT_BOT_ID: boutBotId,
    BOUT_BETA_ID: boutBetaId
  },
  REPLY_TYPES:
  {
    YOU_WIN,
    MOVE_SUCCESS,
    MOVE_FAILED,
    MOVE_INVALID,
    NO_MOVE,
    NEXT_TURN,
    TRY_AGAIN,
    YOU_LOSE
  }
} = require('./constants')

const {
  NODE_ENV,
  DATABASE_URL,
  CONSUMER_KEY: consumer_key,
  CONSUMER_SECRET: consumer_secret,
  ACCESS_TOKEN_KEY: access_token_key,
  ACCESS_TOKEN_SECRET: access_token_secret
} = process.env
const local = !NODE_ENV
const dev = local || NODE_ENV === 'development'

// Connect to database
const client = new pg.Client(`${DATABASE_URL}?ssl=true`)
client.connect()

// Query database
const save = (query, data) => {
  if (!local) {
    client.query(query, data, (err) => {
      if (err) console.error(err)
    })
  }
}

// Initialize Twitter
const twitter = new TwitterPackage({
  consumer_key,
  consumer_secret,
  access_token_key,
  access_token_secret
})

// Post tweets
// - Instead of tweeting, log to console when running locally
const tweet = (status, inReplyToStatusId) => {
  if (local) {
    console.warn('(local) Replied:', status)
  } else {
    twitter.post(
      'statuses/update',
      {
        status,
        in_reply_to_status_id: inReplyToStatusId,
        auto_populate_reply_metadata: true
      },
      (error, reply) => {
        console.error(error || `Replied: ${reply.text}`)
      }
    )
  }
}

// Get an item
const getItem = () => {
  const itemList = Object.keys(items)
  return random(itemList)
}

// Determines if date passed in is over 1 day old
// - Used to detect whether a tweet is too old to respond to
// - Tweets "expire" after one day
// - TODO: Time could be decreased since reponses should be instantaneous
const isOldMention = (createdAt) => {
  const createdDate = new Date(createdAt)
  const date = new Date()
  // If tweet is over 1 day old, return false
  return Math.floor(((date - createdDate) / 86400000)) > 1
}

// Get bout players
// - First two players (mentioner & mentionee)
// - Excludes @bout_bot & @bout_beta
const getBoutPlayers = users =>
  users.filter(u => u.id_str !== boutBotId && u.id_str !== boutBetaId).slice(0, 2)

// Gen bout ID from player IDs
// - Bout ID is user IDs sorted numerically
const getBoutId = users => getBoutPlayers(users).map(u => u.id_str).sort().join('-')

// Main game handling function...
const handleMentions = (bouts, mentions) => {
  // Queue actionable mentions
  const queue = mentions.reduce((result, mention) => {
    const {
      id_str: id,
      full_text: text,
      created_at: createdAt,
      user,
      entities: {
        user_mentions: userMentions
      }
    } = mention
    // When not running locally, don't queue mentions over one week old
    if (isOldMention(createdAt) && !local) return result

    // Get boutId (combined user ids)
    const boutId = getBoutId([user, ...userMentions])

    // Get bout if exists
    const bout = bouts.find(b => b.bout_id === boutId)

    if (bout) {
      const {
        in_progress: inProgress,
        tweet_id: tweetId,
        player_data: {
          players
        }
      } = bout
      if (inProgress) {
        // Check if this users turn
        const userUp = players.find(player => player.turn)
        if (user.id_str !== userUp.id_str) return result
      } else if (id === tweetId) {
        // Not in progress, mention is from previous bout
        return result
      }
    } else if (text.toLowerCase().indexOf('challenge') <= -1) {
      // No bout exists and this isn't a valid starting mention
      return result
    }
    if (result[boutId]) {
      // If a mention has already been queued up, don't do it again
      return result
    }

    // All clear, queue up this mention
    return { ...result, [boutId]: mention }
  }, {})

  console.warn('LOOP THRU QUEUE')
  console.warn('===============')

  Object.keys(queue).forEach((boutId) => {
    // Get user_id, created_id for current mention
    // TODO: delete text, screen_name
    const mention = queue[boutId]
    const {
      id_str: mentionIdStr,
      full_text: text,
      user: {
        screen_name: screenName,
        name,
        id_str: userIdStr
      },
      entities: {
        user_mentions: userMentions,
        hashtags
      }
    } = mention
    console.warn(boutId, `@${screenName} tweeted ${text}`)

    const bout = bouts.find(b => b.bout_id === boutId) // Bout data
    const boutStart = text.toLowerCase().indexOf('challenge') > -1

    if (bout && bout.in_progress) {
      const { players } = bout.player_data
      console.warn(`${players[0].screen_name} (${players[0].item}) vs ${players[1].screen_name} (${players[1].item})`)

      // Object.assign only does a shallow copy
      // - Is that okay?
      let nextPlayerData = Object.assign({}, bout.player_data)

      // Get the data for the player whose turn it is
      const player = players.find(p => p.turn)
      const {
        item,
        tweet_id: tweetId,
        strike,
        condition: activeCondition
      } = player

      const conditionId = activeCondition ? Object.keys(activeCondition)[0] : null
      const conditionData = conditions[conditionId]

      const {
        type: conditionType,
        message: conditionMessage,
        name: conditionName
      } = conditionData || {}

      // If their latest tweet hasn't already been processed...
      if (mentionIdStr !== tweetId) {
        // Step 1. Start status
        let status = ''
        let inProgress = true
        let moveSuccess = true
        let ignoreStrike = false

        // Step 2. Add move result
        players.forEach((id, p) => {
          const {
            turn,
            name: playerName
          } = players[p]

          if (turn) {
            // This player's turn
            // - Update stored tweet ID
            nextPlayerData.players[p].tweet_id = mentionIdStr

            // Update current player conditions
            const { condition } = nextPlayerData.players[p]
            if (condition) {
              condition[conditionId] -= 1
              if (condition[conditionId] <= 0) {
                delete nextPlayerData.players[p].condition[conditionId]
                status += `${conditionName} no longer in effect. `
              }
            }
          } else if (hashtags.length > 0) {
            // Not this player's turn, and there are hashtags

            if (conditionType !== 'sleep') {
              // First hashtag is player's move
              const attemptedMove = hashtags[0].text
              const move = items[item].find(m => m.id === attemptedMove.toLowerCase())

              if (move) {
                // Hashtag matches a valid move the player can use
                const {
                  accuracy,
                  minDamage: min,
                  maxDamage: max,
                  condition
                } = move

                if (Math.random() <= accuracy) {
                  // Move is successful
                  // - Calculate & apply damage
                  const damage = Math.floor(Math.random() * ((max - min) + 1)) + min
                  nextPlayerData.players[p].health -= damage
                  const { health } = nextPlayerData.players[p]

                  if (health <= 0) {
                    // Game-winning move
                    // - Set bout to not in progress
                    status += genReply(YOU_WIN)
                    inProgress = false
                  } else {
                    // Apply condition & recoil
                    if (condition) {
                      nextPlayerData.players[p].condition = condition

                      const {
                        name: conditionName
                      } = conditions[Object.keys(condition)[0]]
                      status += `${conditionName} in effect. `
                    }
                    if (damage > 0) {
                      status += genReply(MOVE_SUCCESS, {
                        playerName,
                        damage,
                        health
                      })
                    } else {
                      status += 'No damage. '
                    }
                  }
                } else {
                  status += genReply(MOVE_FAILED)
                }
              } else {
                status += genReply(MOVE_INVALID, { attemptedMove })
              }
            } else {
              status += conditionMessage
            }
          } else {
            // Not this player's turn, and there are no hashtags
            status += genReply(NO_MOVE)
            moveSuccess = false
          }
        })

        const nextTurn = moveSuccess || strike >= 3

        // Step 3. Add next player action
        players.forEach((id, p) => {
          const { turn } = players[p]

          if (inProgress && nextTurn) {
            // Switch turn for every player
            nextPlayerData.players[p].turn = !turn
          }
          if (!turn) {
            const { screen_name: nextPlayerName } = players[p]
            if (inProgress) {
              if (nextTurn) {
                status += genReply(NEXT_TURN, { nextPlayerName })
              } else {
                status += genReply(TRY_AGAIN, { nextPlayerName })
              }
            } else {
              status += genReply(YOU_LOSE, { nextPlayerName })
            }
          } else if (inProgress) {
            // Set strikes for current player
            if (nextTurn) {
              nextPlayerData.players[p].strike = 0
            } else {
              nextPlayerData.players[p].strike += 1
              const { strike: strikes } = nextPlayerData.players[p]
              if (strikes && strikes < 3) {
                ignoreStrike = true
              }
            }
          } else {
            nextPlayerData = {}
          }
        })

        console.warn('Updating bout', boutId)
        const updatedBout = [
          inProgress,
          nextPlayerData,
          boutId
        ]

        const query = 'UPDATE bouts SET in_progress = $1, player_data = $2 WHERE bout_id = $3'
        save(query, updatedBout)

        if (dev) status += ' (dev)'
        if (!ignoreStrike) tweet(status, mentionIdStr)
      } else {
        console.warn('This tweet is.. old.')
      }
    } else if (boutStart) {
      // NEW BOUT //
      console.warn('NEW BOUT')

      // Create array of everyone involved in bout
      // TODO: limit to 2 for now
      const players = getBoutPlayers([
        { screen_name: screenName, name, id_str: userIdStr },
        ...userMentions // TODO: Indices gets added here..
      ])

      // Each player gets...
      // - 1 random item
      // - 12 health
      // - 0 strikes

      // First player (p index is 0)
      // - tweet ID is stored
      // - turn set
      players.forEach((id, p) => {
        players[p].item = getItem()
        players[p].health = 12
        players[p].tweet_id = !p ? mentionIdStr : ''
        players[p].turn = !p
        players[p].strike = 0
      })
      const playerData = { players }
      const inProgress = true
      const query = bout
        ? 'UPDATE bouts SET in_progress = $1, player_data = $2, tweet_id = $3 WHERE bout_id = $4'
        : 'INSERT INTO bouts (in_progress, player_data, tweet_id, bout_id) values ($1, $2, $3, $4)'

      // Create bout array to store
      const newBout = [
        inProgress,
        playerData,
        mentionIdStr,
        boutId
      ]

      const getMove = (item) => {
        const move = random(items[item])
        return move.id
      }

      // Compose tweet
      const status = 'Game on! You have '
      + `${players[0].item} (#${getMove(players[0].item)}). `
      + `@${players[1].screen_name} has ${players[1].item} `
      + `(#${getMove(players[1].item)}). `
      + `Your move, @${players[0].screen_name}!${dev ? ' (dev)' : ''}`

      save(query, newBout)
      tweet(status, mentionIdStr)
    } else {
      console.warn('Not playing Bout (yet). Ignore.')
    }
    // Line break
    console.warn('')
  })
  setTimeout(() => {
    client.end((err) => {
      if (err) throw err
    })
  }, 300)
}

// Get bouts from database
const getBouts = (mentions) => {
  const query = 'SELECT * FROM bouts;'
  const boutsData = client.query(query)
  boutsData.on('row', (row, result) => {
    result.addRow(row)
  })
  boutsData.on('end', ({ rows: bouts }) => {
    handleMentions(bouts, mentions)
  })
}

// Get mentions of @bout_bot
const getMentions = () => {
  twitter.get(
    'statuses/mentions_timeline',
    { tweet_mode: 'extended' },
    (error, mentions) => {
      if (!error) {
        getBouts(mentions)
      } else {
        // Getting mentions from Twitter failed
        console.error(error)
      }
    }
  )
}

if (local) {
  handleMentions(testBouts, testMentions)
} else {
  getMentions()
}
