const TwitterPackage = require('twitter')
const pg = require('pg')
const test_mentions = require('./test_mentions')
const items = require('./items')
const bout_bot_id = '2578652522'
const dev = false
const {
  DATABASE_URL,
  CONSUMER_KEY: consumer_key,
  CONSUMER_SECRET: consumer_secret,
  ACCESS_TOKEN_KEY: access_token_key,
  ACCESS_TOKEN_SECRET: access_token_secret
} = process.env

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
  const bouts_data = client.query('SELECT * FROM bouts;')
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
  if (dev) {
    console.log('(dev) Replied:', status)
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
  return item_list[Math.floor(Math.random() * item_list.length)]
}

const handleMentions = (bouts, mentions) => {
  console.log('LOOP THRU MENTIONS')
  console.log('==================')

  // Loop through mentions to get actionable tweets
  let queue = {}
  let queued_bouts = {}

  for (i in mentions) {
    // Get user_id, created_id for current mention (TODO: delete text, screen_name)
    const { id_str: tweet_id, text, created_at, user: { id_str: current_id, screen_name }, entities: { user_mentions } } = mentions[i]

    // Calculate age of tweet in days
    const created_date = new Date(created_at)
    const date = new Date()
    const age = Math.floor(((date - created_date) / 86400000))
    // If tweet is over 1 week old, stop queueing
    if (age > 7 && !dev) break

    console.log('Mention #' + i, '@' + screen_name + ' tweeted "' + text + '" (' + age + ' days ago)')

    // Check if an opponent is mentioned
    if (user_mentions.length > 1) {
      const {id_str: next_id, screen_name: next_screen_name} = user_mentions[1]

      // Get bout_id
      let current_bout_id
      for (b in bouts) {
        const { bout_id, tweet_id: bout_tweet_id, current_id: bout_current_id, next_id: bout_next_id } = bouts[b]
        // Second of these can go away once current_id is always the player whose turn it is
        if ([current_id, next_id].sort().join('-') === bout_id) current_bout_id = bout_id
      }
      console.log('Bout:', current_bout_id)

      // Queue this bout if it hasn't been queued yet
      // TODO: Better handle undefined (new) bouts, this probably allows multiple rounds with the same players to start at the same time
      // --- Although they'd have to do multiple valid initiating bout tweets, but could happen
      if (!queued_bouts[current_bout_id] || current_bout_id === undefined) {
        if (current_bout_id !== undefined) queued_bouts[current_bout_id] = i
        // TODO: Can handle some tweet validation here - such as, shouldn't queue up non-turn tweets or invalid init tweets
        queue[i] = {
          bout_id: current_bout_id,
          mention: mentions[i]
        }
      }
      console.log('---')
    }
  }
  console.log('')

  console.log('LOOP THRU QUEUE')
  console.log('===============')

  for (q in queue) {
    // Get user_id, created_id for current mention (TODO: delete text, screen_name)
    const { bout_id, mention } = queue[q]
    const { id_str: tweet_id, text, user, user: { screen_name: s }, entities: { user_mentions } } = mention
    console.log('#' + q, '@' + s + ' tweeted "' + text + '"')

    const bout = bouts.find(bout => bout.bout_id === bout_id) // Bout data

    // Create array of everyone involved in bout
    // TODO: limit to 2 for now
    const players = [user, ...user_mentions]

    // Remove bout_bout from array
    for (let p in players) {
      if (players[p].id_str === bout_bot_id ) {
        players.splice(p, 1)
        break
      }
    }

    if (bout === undefined && text.indexOf('challenge') <= -1 || bout && !bout.in_progress && text.indexOf('challenge') <= -1) {
      // IGNORE //
      console.log('Not playing Bout (yet). Ignore.')
    } else if (bout === undefined && text.indexOf('challenge') > -1 || bout && !bout.in_progress && text.indexOf('challenge') > -1) {
      // NEW BOUT //
      console.log('NEW BOUT')

      // Create bout id
      const new_bout_id = players.map((p) => p.id_str).sort().join('-')

      players.forEach((id, p) => {
        players[p].item = getItem()
        players[p].health = 12
        players[p].turn = !p
      })

      const in_progress = true
      const player_data = { players }

      // Create bout array to store
      const new_bout = [
        new_bout_id,
        tweet_id,
        in_progress,
        player_data
      ]

      // INSERT INTO players
      save('INSERT INTO bouts (bout_id, tweet_id, in_progress, player_data) values ($1, $2, $3, $4)', new_bout)

      // Compose tweet
      const status = '@' +
        players[0].screen_name + ' Game on! You have ' +
        players[0].item + ' (#' +
        items[players[0].item].move + '). @' +
        players[1].screen_name + ' has ' +
        players[1].item + ' (#' +
        items[players[1].item].move + '). Your move, @' +
        players[0].screen_name + '!'
      tweet(status, tweet_id)

    } else if (tweet_id !== bout.tweet_id) {
      // CURRENT BOUT //
      console.log('Bout:', bout_id)

      const { players: player_data } = bout.player_data

      console.log('Players:', player_data[0].screen_name + ' (' + player_data[0].item + ') vs ' + player_data[1].screen_name + ' (' + player_data[1].item + ')')

      const {id_str: tweet_id, entities: {hashtags}} = queue[q].mention

      let next = {
        ...bout,
        tweet_id
      }

      const _player = player_data.find(player => player.turn) // Hopefully only returns player whose turn it is...
      const { item } = _player

      let status = '@' + _player.screen_name + ' '
      let in_progress = true

      player_data.forEach((id, p) => {
        const { turn, screen_name } = player_data[p]
        // Switch turn for every player
        next.player_data.players[p].turn = !turn
        // If not this player's turn, calc damage
        if (!turn) {
          if (hashtags.length > 0) {
            const {move, accuracy, minDamage: min, maxDamage: max} = items[item]
            if (hashtags[0].text.toLowerCase() === move) { // Only checks first hashtag
              if (Math.random() <= accuracy) {
                const damage = Math.floor(Math.random() * (max - min + 1)) + min
                // Tricky way of specifying other player: 1 - 1 = 0 (other player), |0 - 1| = 1 (other player)
                next.player_data.players[p].health -= damage
                if (next.player_data.players[p].health <= 0) {
                  status += 'You win! Better luck next time, @' + screen_name + '.'
                  in_progress = false
                } else {
                  status += 'Wow! @' + screen_name + ' took ' + damage + ' damage. ' + next.player_data.players[p].health + ' health remaining. Your move, @' + screen_name + '!'
                }
              } else {
                status += 'Your attack missed. Your move, @' + screen_name + '!'
              }
            } else {
              status += 'Epic fail! You do not have the move "' + move + '". Your move, @' + screen_name + '.'
            }
          } else {
            status += 'No move detected... Your move, @' + screen_name + '!'
          }
        }
      })

      console.log('Updating bouts...')
      const updated_bout = [
        next.tweet_id,
        in_progress,
        next.player_data,
        bout_id
      ]

      tweet(status, tweet_id)
      save('UPDATE bouts SET tweet_id = $1, in_progress = $2, player_data = $3 WHERE bout_id = $4', updated_bout)
    } else {
      console.log('OLD TWEET OR NOT THEIR TURN')
    }

    console.log('---')
  }
  setTimeout(function () {
    client.end(function (err) {
      if (err) throw err
    })
  }, 300)
}

if (dev) {
  getBouts(test_mentions)
} else {
  getMentions()
}
