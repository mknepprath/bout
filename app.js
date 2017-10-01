const TwitterPackage = require('twitter')
const pg = require('pg')
const test_mentions = require('./test_mentions')
const items = require('./items')
const bout_bot_id = '3016652708'
const bout_beta_id = '2578652522'
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
const client = new pg.Client(DATABASE_URL + '?ssl=true')
client.connect()

// Query database
const save = (query, data) => {
  client.query(query, data, function (err, rows) {
    if (err) console.log(err)
  })
}

// Get bouts from database
const getBouts = (mentions) => {
  const query = 'SELECT * FROM bouts;'
  const bouts_data = client.query(query)
  bouts_data.on('row', function (row, result) {
    result.addRow(row)
  })
  bouts_data.on('end', function (result) {
    handleMentions(result.rows, mentions)
  })
}

// Initialize Twitter
const twitter = new TwitterPackage({
  consumer_key,
  consumer_secret,
  access_token_key,
  access_token_secret
})

// Post tweets
const tweet = (status, in_reply_to_status_id) => {
  if (local) {
    console.log('(local) Replied:', status)
  } else {
    twitter.post('statuses/update', { status, in_reply_to_status_id }, function (error, reply, response) {
      console.log(error || 'Replied: ' + reply.text)
    })
  }
}

// Get mentions of @bout_bot
const getMentions = () => {
  twitter.get('statuses/mentions_timeline', function (error, mentions, response) {
    if (!error) {
      getBouts(mentions)
    } else {
      // Getting mentions from Twitter failed
      console.log(error)
    }
  })
}

// Get an item
const getItem = () => {
  const item_list = Object.keys(items)
  return random(item_list)
}

// Return a random item from array
const random = (n) => {
  return n[Math.floor(Math.random() * n.length)]
}

const handleMentions = (bouts, mentions) => {
  console.log('LOOP THRU MENTIONS')
  console.log('==================')

  // Loop through mentions to get actionable tweets
  let queue = {}
  let queued_bouts = {}

  for (i in mentions) {
    // Get user_id, created_id for current mention
    // TODO: delete text, screen_name
    const {
      text,
      created_at,
      user: {
        id_str: current_id,
        screen_name
      },
      entities: {
        user_mentions
      }
    } = mentions[i]

    // Calculate age of tweet in days
    const created_date = new Date(created_at)
    const date = new Date()
    const age = Math.floor(((date - created_date) / 86400000))
    // If tweet is over 1 week old, stop queueing
    if (age > 7 && !local) break

    console.log('Mention #' + i, '@' + screen_name + ' tweeted "' + text + '" (' + age + ' days ago)')

    // Get all users mentioned (except @bout_bot)
    let _users = [current_id]
    if (user_mentions.length > 1) {
      for (m in user_mentions) {
        const { id_str } = user_mentions[m]
        if (id_str !== bout_bot_id && id_str !== bout_beta_id) {
          _users.push(id_str)
        }
      }
      // Only use first two accounts mentioned
      const _players = _users.slice(0, 2)
      const bout_id = _players.sort().join('-')
      const bout = bouts.find(bout => bout.bout_id === bout_id)
      const tweet_id = !!bout && bout.tweet_id
      console.log('Bout', bout ? bout.bout_id : bout_id)

      // If bout isn't in progress (or doesn't exist) and isn't queued...
      if (!(bout && bout.in_progress)) {
        // check if tweet contains 'challenge'...
        if (text.toLowerCase().indexOf('challenge') > -1 && !queued_bouts[bout_id]) {
          // if so, "queue" it so older tweets aren't used...
          queued_bouts[bout_id] = i
          // if this is a new initiating tweet, queue it for real
          if (tweet_id !== mentions[i].id_str) {
            queue[i] = {
              bout_id,
              mention: mentions[i]
            }
          }
        }
      } else if (!queued_bouts[bout.bout_id]) {
        // Store latest tweet from a bout
        const _player = bout.player_data.players.find(player => player.turn)
        if (_player.id_str === current_id) {
          queued_bouts[bout.bout_id] = i
          queue[i] = {
            bout_id: bout.bout_id,
            mention: mentions[i]
          }
        }
      }
      console.log('---')
    }
  }
  console.log('')

  console.log('LOOP THRU QUEUE')
  console.log('===============')

  for (q in queue) {
    // Get user_id, created_id for current mention
    // TODO: delete text, screen_name
    const { bout_id, mention } = queue[q]
    const {
      id_str: tweet_id,
      text,
      user: {
        screen_name,
        name,
        id_str
      },
      entities: {
        user_mentions
      }
    } = mention
    console.log('#' + q, '@' + screen_name + ' tweeted "' + text + '"')

    const bout = bouts.find(bout => bout.bout_id === bout_id) // Bout data

    // Create array of everyone involved in bout
    // TODO: limit to 2 for now
    const users = [
      { screen_name, name, id_str },
      ...user_mentions // TODO: Indices gets added here..
    ]

    // Remove bout_bout from array
    for (let p in users) {
      if (users[p].id_str === bout_bot_id || users[p].id_str === bout_beta_id) {
        users.splice(p, 1)
        break
      }
    }

    // Only use first two accounts mentioned
    const players = users.slice(0, 2)

    const bout_in_progress = bout && bout.in_progress
    const bout_start = text.toLowerCase().indexOf('challenge') > -1

    if (bout_in_progress) {
      // CURRENT BOUT //
      console.log('Bout:', bout_id)

      const { players } = bout.player_data

      console.log(
        'Players:',
        players[0].screen_name + ' (' +
        players[0].item + ') vs ' +
        players[1].screen_name + ' (' +
        players[1].item + ')'
      )

      const {id_str, entities: {hashtags}} = queue[q].mention

      let next = Object.assign({}, bout)

      const _player = players.find(player => player.turn)
      const { item, tweet_id, strike } = _player

      if (id_str !== tweet_id) {
        // Step 1. Start status
        let status = '@' + _player.screen_name + ' '
        let in_progress = true
        let move_success = true
        let ignore_strike = false

        // Step 2. Add move result
        players.forEach((id, p) => {
          const { turn, screen_name, name } = players[p]
          // Assign tweet_id to player
          if (turn) {
            next.player_data.players[p].tweet_id = id_str
          } else {
            // If not this player's turn, calc damage
            if (hashtags.length > 0) {
              const attempted_move = hashtags[0].text
              const move = items[item].find(move => move.id === attempted_move.toLowerCase())
              // Only checks first hashtag
              if (move) {
                const {accuracy, minDamage: min, maxDamage: max} = move
                if (Math.random() <= accuracy) {
                  const damage = Math.floor(Math.random() * (max - min + 1)) + min
                  next.player_data.players[p].health -= damage
                  const { health } = next.player_data.players[p]
                  if (health <= 0) {
                    const reply = [
                      'You win! ',
                      'You are the victor! ',
                      'Game over, you win! ',
                      'That\'s the game, you win! '
                    ]
                    status += random(reply)
                    in_progress = false
                  } else {
                    const reply = [
                      'Wow! ' + name + ' took ' + damage + ' damage. ' + health + ' health remaining. ',
                      name + ' tried to dodge, but took ' + damage + ' damage. ' + health + ' health remaining. ',
                      'You successfully hit ' + name + ' for ' + damage + ' points of damage. ' + health + ' health remaining. ',
                      'Hit! ' + name + ' has ' + health + ' health left after taking ' + damage + ' damage. ',
                      name + ' did not like that. ' + damage + ' damage, ' + health + ' health remaining. ',
                      'Down, but not out! ' + name + ' takes ' + damage + ' damage and has ' + health + ' health left. ',
                      'That did it. ' + name + ' has ' + health + ' health left after taking ' + damage + ' damage. '
                    ]
                    status += random(reply)
                  }
                } else {
                  const reply = [
                    'Your attack missed. ',
                    'You missed! ',
                    'You failed to hit your target. ',
                    'You trip over a rock. ',
                    'You miss, but barely. ',
                    'You miss and hit a tree. ',
                    'It looked good, but you missed. ',
                    'They dodged the attack! '
                  ]
                  status += random(reply)
                }
              } else {
                const reply = [
                  'Epic fail! You do not have the move "' + attempted_move + '". ',
                  'You don\'t have the move "' + attempted_move + '". ',
                  'You can\'t use "' + attempted_move + '" because you don\'t have it. ',
                  'Nice try, but you don\'t have "' + attempted_move + '". '
                ]
                status += random(reply)
              }
            } else {
              const reply = [
                'No move detected... ',
                'No valid move found in this tweet. ',
                'What attack will you use? ',
                'What move will you use? '
              ]
              status += random(reply)
              move_success = false
            }
          }
        })

        const next_turn = move_success || strike >= 3

        // Step 3. Add next player action
        players.forEach((id, p) => {
          const { turn, screen_name, name } = players[p]
          if (in_progress && next_turn) {
            // Switch turn for every player
            next.player_data.players[p].turn = !turn
          }
          if (!turn) {
            if (in_progress) {
              if (next_turn) {
                const reply = [
                  'Your move, @' + screen_name + '!',
                  'It\'s your turn, @' + screen_name + '.',
                  'Make your move, @' + screen_name + '!',
                  'Wow. Well, now it\'s @' + screen_name + '\'s turn.',
                  '@' + screen_name + '\'s turn.',
                  '@' + screen_name + '\'s move!',
                  'Next up: @' + screen_name + '!'
                ]
                status += random(reply)
              } else {
                const reply = [
                  'Try again! @' + screen_name + ' is waiting.',
                  'It\'s your turn, make a move! @' + screen_name + ' appears to be losing their patience.',
                  'Take your turn, or it will become @' + screen_name + '\'s turn!',
                  '@' + screen_name + ' wants to go, but you have to make your move first. '
                ]
                status += random(reply)
              }
            } else {
              const reply = [
                'Better luck next time, @' + screen_name + '.',
                'You\'ll get \'em next time, @' + screen_name + '!',
                'Shoot, I was rooting for @' + screen_name + '!',
                'It was close, @' + screen_name + '. Next time!',
                '@' + screen_name + ' was close, though!',
                'With a little training, you\'ll win next time @' + screen_name + '!',
                'It was anyone\'s game. I sense a comeback, @' + screen_name + '!'
              ]
              status += random(reply)
            }
          } else {
            // Set strikes for current player
            if (in_progress) {
              if (next_turn) {
                next.player_data.players[p].strike = 0
              } else {
                next.player_data.players[p].strike += 1
                if (
                  next.player_data.players[p].strike &&
                  next.player_data.players[p].strike < 3) {
                  ignore_strike = true
                }
              }
            } else {
              next.player_data = {}
            }
          }
        })

        console.log('Updating bout', bout_id)
        const updated_bout = [
          in_progress,
          next.player_data,
          bout_id
        ]

        const query = 'UPDATE bouts SET in_progress = $1, player_data = $2 WHERE bout_id = $3'
        save(query, updated_bout)

        if (dev) status += ' (dev)'
        if (!ignore_strike) tweet(status, id_str)
      } else {
        console.log('This tweet is.. old.')
      }
    } else {
      if (bout_start) {
        // NEW BOUT //
        console.log('NEW BOUT')

        // Create bout id
        const bout_id = players.map((p) => p.id_str).sort().join('-')

        players.forEach((id, p) => {
          players[p].item = getItem()
          players[p].health = 12
          players[p].tweet_id = !p ? tweet_id : ''
          players[p].turn = !p
          players[p].strike = 0
        })
        const player_data = { players }
        const in_progress = true
        const query = bout
          ? 'UPDATE bouts SET in_progress = $1, player_data = $2, tweet_id = $3 WHERE bout_id = $4'
          : 'INSERT INTO bouts (in_progress, player_data, tweet_id, bout_id) values ($1, $2, $3, $4)'

        // Create bout array to store
        const new_bout = [
          in_progress,
          player_data,
          tweet_id,
          bout_id
        ]

        const getMove = (item) => {
          const move = random(items[item])
          return move.id
        }

        // Compose tweet
        const status = '@' +
          players[0].screen_name + ' Game on! You have ' +
          players[0].item + ' (#' +
          getMove(players[0].item) + '). @' +
          players[1].screen_name + ' has ' +
          players[1].item + ' (#' +
          getMove(players[1].item) + '). Your move, @' +
          players[0].screen_name + '!' + 
          (dev ? ' (dev)' : '')

        save(query, new_bout)
        tweet(status, tweet_id)
      } else {
        // IGNORE //
        console.log('Not playing Bout (yet). Ignore.')
      }
    }
    console.log('---')
  }
  setTimeout(function () {
    client.end(function (err) {
      if (err) throw err
    })
  }, 300)
}

if (local) {
  getBouts(test_mentions)
} else {
  getMentions()
}
