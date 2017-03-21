const TwitterPackage = require('twitter')
const pg = require('pg')

pg.defaults.ssl = true
pg.connect(process.env.DATABASE_URL, function(err, client) {
  if (err) throw err
  console.log('Connected to postgres! Getting schemas...')

  client
    .query('SELECT table_schema,table_name FROM information_schema.tables;')
    .on('row', function(row) {
      console.log(JSON.stringify(row))
    })
})

// Initialize Twitter
const twitterConfig = {
  consumer_key: 'XXXXX',
  consumer_secret: 'XXXXX',
  access_token_key: 'XXXXX',
  access_token_secret: 'XXXXX'
}
const twitter = new TwitterPackage(twitterConfig)

const items = {
  stick: {
    minDamage: 1,
    maxDamage: 3,
    accuracy: 0.8
  }
}

twitter.get('statuses/mentions_timeline', {screen_name: 'mknepprath'}, function(error, mentions, response) {
  if (!error) {
    let replyQueue = []
    for (i in mentions) {
      console.log(mentions[i].user.id)
      replyQueue[i] = mentions[i].id_str
    }
    console.log(replyQueue)
    // console.log(mentions[0].id_str)
    // twitter.post('statuses/update', {status: '@mknepprath you got it', in_reply_to_status_id: mentions[0].id_str}, function(error, reply, response) {
    //   if (!error) console.log(reply.text)
    // })
  }
})

// twitter.post('statuses/update', {status: 'Big things to come!'},  function(error, tweet, response){
//   if(error){
//     console.log(error)
//   }
//   console.log(tweet)  // Tweet body.
//   console.log(response)  // Raw response object.
// })
