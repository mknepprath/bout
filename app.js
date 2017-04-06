const TwitterPackage = require('twitter')
const pg = require('pg')

// Connect to database
const conString = process.env.DATABASE_URL + '?ssl=true'
const client = new pg.Client(conString)
client.connect()

// 'CREATE TABLE bouts (id SERIAL PRIMARY KEY, tweet_id VARCHAR(40) not null, current_id VARCHAR(40) not null, next_id VARCHAR(40) not null, player_data jsonb);'

// Initialize Twitter
const twitterConfig = {
  consumer_key: process.env.CONSUMER_KEY,
  consumer_secret: process.env.CONSUMER_SECRET,
  access_token_key: process.env.ACCESS_TOKEN_KEY,
  access_token_secret: process.env.ACCESS_TOKEN_SECRET
}
const twitter = new TwitterPackage(twitterConfig)

// Available items and moves
const items = {
  fists: {
    move: 'punch',
    minDamage: 1,
    maxDamage: 3,
    accuracy: 1
  },
  stick: {
    move: 'swing',
    minDamage: 1,
    maxDamage: 4,
    accuracy: 0.8
  },
  rock: {
    move: 'throw',
    minDamage: 1,
    maxDamage: 5,
    accuracy: 0.6
  },
  sword: {
    move: 'slash',
    minDamage: 2,
    maxDamage: 6,
    accuracy: 0.5
  }
}
const item_list = Object.keys(items)

const bout_bot_id = '2578652522'

// Get mentions of @bout_bot
twitter.get('statuses/mentions_timeline', function(error, mentions, response) {
  if (!error) {
    const bouts_data = client.query('SELECT * FROM bouts;')
    bouts_data.on('row', function (row, result) {
      result.addRow(row)
    })
    bouts_data.on('end', function (result) {
      const bouts = result.rows

      console.log('LOOP THRU MENTIONS')
      console.log('==================')

      // Loop through mentions to get actionable tweets
      let queue = {}
      let queued_bouts = {}

      for (i in mentions) {
        // Get user_id, created_id for current mention (TODO: delete text, screen_name)
        const {id_str: tweet_id, text, created_at, user: {id_str: current_id, screen_name}, entities: {user_mentions}} = mentions[i]

        // Calculate age of tweet
        const created_date = new Date(created_at)
        const date = new Date()
        const age = Math.floor(((date - created_date) / 86400000))
        // If tweet is over 1 week old, stop queueing
        if (age > 7) break

        console.log('Mention #' + i + ':', '@' + screen_name + ' - ' + text)
        console.log('Mention age:', age + ' days')

        // Check if an opponent is mentioned
        if (user_mentions.length > 1) {
          const {id_str: next_id, screen_name: next_screen_name} = user_mentions[1]
          console.log('Mentioned:', next_screen_name)

          // Get bout_id
          let bout_id
          for (b in bouts) {
            const {id, tweet_id: bout_tweet_id, current_id: bout_current_id, next_id: bout_next_id} = bouts[b]
            // Second of these can go away once current_id is always the player whose turn it is
            if (
              current_id === bout_current_id && next_id === bout_next_id ||
              current_id === bout_next_id && next_id === bout_current_id
            ) bout_id = id
          }
          console.log('Bout:', bout_id)

          // Queue this bout if it hasn't been queued yet
          // TODO: Better handle undefined (new) bouts, this probably allows multiple rounds with the same players to start at the same time
          // --- Although they'd have to do multiple valid initiating bout tweets, but could happen
          if (!queued_bouts[bout_id] || bout_id === undefined) {
            if (bout_id !== undefined) queued_bouts[bout_id] = i
            queue[i] = {
              bout_id: bout_id,
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
        const {bout_id, mention} = queue[q]
        const {id_str: tweet_id, text, in_reply_to_user_id_str, user: {id_str: current_id, screen_name}, entities: {user_mentions}} = mention
        const bout = bouts.find(bout => bout.id === bout_id) // Bout data
        console.log('#' + q + ':', '@' + screen_name + ' - ' + text)

        // If tweet in reply to bout_bot
        if (in_reply_to_user_id_str === bout_bot_id) {
          const {id_str: next_id, screen_name: next_screen_name} = user_mentions[1]

          console.log('Directed at:', '@' + next_screen_name)

          if (bout === undefined) {
            // New bout
            if (text.indexOf('challenge') > -1) {
              // Valid new bout tweet
              console.log('NEW BOUT')

              // Create new players object
              let player_data = {}
              player_data[current_id] = {}
              player_data[next_id] = {}
              for (p in player_data) {
                player_data[p].screen_name = p === current_id ? screen_name : next_screen_name
                player_data[p].item = item_list[Math.floor(Math.random() * (item_list.length))]
                player_data[p].health = 12
              }

              // Create bout object to store
              // TODO: Could this be an array and get passed in that way...
              const new_bout = {
                tweet_id: tweet_id,
                current_id: current_id,
                next_id: next_id,
                player_data: player_data
              }

              // INSERT INTO players
              client.query('INSERT INTO bouts (tweet_id, current_id, next_id, player_data) values ($1, $2, $3, $4)', [new_bout.tweet_id, new_bout.current_id, new_bout.next_id, new_bout.player_data], function(err, rows) {
                if (!err) {
                  console.log('Added bout to db')
                  console.log('rows', rows)
                } else {
                  console.log('err', err)
                }
              })

              // Compose tweet
              const reply_tweet = '@' + player_data[current_id].screen_name + ' Game on! You have ' + player_data[current_id].item + ' (#' + items[player_data[current_id].item].move + '). @' + player_data[next_id].screen_name + ' has ' + player_data[next_id].item + ' (#' + items[player_data[next_id].item].move + '). Your move, @' + player_data[current_id].screen_name + '!'
              console.log('Reply:', reply_tweet)

              // Post tweet
              twitter.post('statuses/update', {status: reply_tweet, in_reply_to_status_id: tweet_id}, function(error, reply, response) {
                if (!error) {
                  console.log('Replied!', reply.text)
                } else {
                  console.log('Tweet failed.')
                  console.log(error)
                }
              })

            } else {
              // No current bout, and tweet isn't a valid to start one
              console.log('IGNORE TWEET')
            }
          } else if (tweet_id !== bout.tweet_id && current_id === bout.current_id) {
            // Current bout
            console.log('Bout:', bout_id)
            const bout_state = bouts.find(bout => bout.id === bout_id)
            const {current_id, next_id, player_data} = bout_state

            console.log('Players:', player_data[current_id].screen_name + ' (' + player_data[current_id].item + ') vs ' + player_data[next_id].screen_name + ' (' + player_data[next_id].item + ')')

            const {id_str: tweet_id, entities: {hashtags}} = queue[q].mention

            let next_bout_state = {
              tweet_id: tweet_id,
              current_id: next_id,
              next_id: current_id,
              player_data: player_data
            }

            if (hashtags.length > 0) {
              for (let h in hashtags) {
                console.log('Hashtag #' + h + ':', hashtags[h].text)
                const {move, accuracy, minDamage: min, maxDamage: max} = items[player_data[current_id].item]
                if (hashtags[h].text.toLowerCase() === move) {
                  console.log(move + ' is a valid move!')
                  if (Math.random() <= accuracy) {
                    console.log('Attack hits!')
                    const damage = Math.floor(Math.random() * (max - min + 1)) + min
                    console.log('Damage:', damage)
                    next_bout_state.player_data[next_id].health -= damage

                    if (next_bout_state.player_data[next_id].health <= 0) {
                      // Compose tweet
                      const reply_tweet = '@' + player_data[current_id].screen_name + ' You win! Better luck next time, @' + player_data[next_id].screen_name + '.'
                      console.log('Reply:', reply_tweet)

                      // Post tweet
                      twitter.post('statuses/update', {status: reply_tweet, in_reply_to_status_id: tweet_id}, function(error, reply, response) {
                        if (!error) {
                          console.log('Replied!', reply.text)
                        } else {
                          console.log('Tweet failed.')
                          console.log(error)
                        }
                      })

                      // Delete bout
                      console.log('Delete:', bout_id)
                      client.query('DELETE FROM bouts WHERE id = $1', [bout_id], function(err, rows) {
                        if (!err) {
                          console.log('Deleted bout.')
                        } else {
                          console.log(err)
                          console.log('Failed to delete db')
                        }
                      })
                      break
                    } else {
                      // Compose tweet
                      const reply_tweet = '@' + player_data[current_id].screen_name + ' Wow! @' + player_data[next_id].screen_name + ' took ' + damage + ' damage. ' + next_bout_state.player_data[next_id].health + ' health remaining. Your move, @' + player_data[next_id].screen_name + '!'
                      console.log('Reply:', reply_tweet)

                      // Post tweet
                      twitter.post('statuses/update', {status: reply_tweet, in_reply_to_status_id: tweet_id}, function(error, reply, response) {
                        if (!error) {
                          console.log('Replied!', reply.text)
                        } else {
                          console.log('Tweet failed.')
                          console.log(error)
                        }
                      })
                      break
                    }
                  } else {
                    console.log('Attack missed')

                    // Tweet 'You missed @' + player_data[next_id].screen_name + '!'
                    // Compose tweet
                    const reply_tweet = '@' + player_data[current_id].screen_name + ' Your attack missed. Your move, @' + player_data[next_id].screen_name + '!'
                    console.log('Reply:', reply_tweet)

                    // Post tweet
                    twitter.post('statuses/update', {status: reply_tweet, in_reply_to_status_id: tweet_id}, function(error, reply, response) {
                      if (!error) {
                        console.log('Replied!', reply.text)
                      } else {
                        console.log('Tweet failed.')
                        console.log(error)
                      }
                    })
                    break
                  }
                } else {
                  // No hashtags found that matched moves
                  console.log(move + ' is not a valid move')

                  // Tweet 'Not a valid move!'
                  // Compose tweet
                  const reply_tweet = '@' + player_data[current_id].screen_name + ' Epic fail! Your move, @' + player_data[next_id].screen_name + '.'
                  console.log('Reply:', reply_tweet)

                  // Post tweet
                  twitter.post('statuses/update', {status: reply_tweet, in_reply_to_status_id: tweet_id}, function(error, reply, response) {
                    if (!error) {
                      console.log('Replied!', reply.text)
                    } else {
                      console.log('Tweet failed.')
                      console.log(error)
                    }
                  })
                }
              }
            } else {
              // No hashtags found
              console.log('No valid moves')

              // 'Were you going to make a move? @' + player_data[next_id].screen_name + '/'s turn!'
              // Compose tweet
              const reply_tweet = '@' + player_data[current_id].screen_name + ' No move detected... Your move, @' + player_data[next_id].screen_name + '!'
              console.log('Reply:', reply_tweet)

              // Post tweet
              twitter.post('statuses/update', {status: reply_tweet, in_reply_to_status_id: tweet_id}, function(error, reply, response) {
                if (!error) {
                  console.log('Replied!', reply.text)
                } else {
                  console.log('Tweet failed.')
                  console.log(error)
                }
              })
            }

            console.log('To store:', next_bout_state)
            client.query('UPDATE bouts SET tweet_id = $1, current_id = $2, next_id = $3, player_data = $4 WHERE id = $5', [next_bout_state.tweet_id, next_bout_state.current_id, next_bout_state.next_id, next_bout_state.player_data, bout_id], function(err, rows) {
              if (!err) {
                console.log('Updated bout in db')
              } else {
                console.log(err)
                console.log('Failed to update db')
              }
            })
          } else {
            console.log('OLD TWEET OR NOT THEIR TURN')
          }
        }
        console.log('---')
      }
      setTimeout(function () {
        client.end(function (err) {
          if (err) throw err
        })
      }, 300)
    })
  } else {
    // Getting mentions from Twitter failed
    console.log('Getting tweets failed.')
    console.log(error)
  }
})
