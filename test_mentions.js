// ASH slash
// MK throw

const testMentions = [
  { // ASH FIRST ATTACK
    created_at: 'Sun Aug 20 03:55:09 +0000 2017',
    id_str: String(Math.floor(Math.random() * 100000)),
    text: '@bout_bot @mknepprath #slash',
    in_reply_to_user_id_str: '3016652708',
    entities: {
      hashtags: [
        {
          text: 'slash'
        }
      ],
      user_mentions: [
        {
          screen_name: 'bout_bot',
          name: 'Bout',
          id_str: '3016652708'
        }, {
          screen_name: 'mknepprath',
          name: 'Michael Knepprath',
          id_str: '123'
        }
      ]
    },
    user: {
      id_str: '456',
      name: 'Ash Ketchum',
      screen_name: 'ash',
    }
  },
  { // ASH FAIL TWEET
    created_at: 'Sun Aug 20 03:55:09 +0000 2017',
    id_str: '1000001',
    text: '@bout_bot @mknepprath what?',
    in_reply_to_user_id_str: '3016652708',
    entities: {
      hashtags: [],
      user_mentions: [
        {
          screen_name: 'bout_bot',
          name: 'Bout',
          id_str: '3016652708'
        }, {
          screen_name: 'mknepprath',
          name: 'Michael Knepprath',
          id_str: '123'
        }
      ]
    },
    user: {
      id_str: '456',
      name: 'Ash Ketchum',
      screen_name: 'ash',
    }
  },
  { // MK FIRST ATTACK
    created_at: 'Sat Aug 19 03:55:10 +0000 2017',
    id_str: String(Math.floor(Math.random() * 100)),
    text: '@bout_bot @ash #throw',
    in_reply_to_user_id_str: '3016652708',
    entities: {
      hashtags: [
        {
          text: 'throw'
        }
      ],
      user_mentions: [
        {
          screen_name: 'bout_bot',
          name: 'Bout',
          id_str: '3016652708'
        }, {
          screen_name: 'ash',
          name: 'Ash Ketchum',
          id_str: '456'
        }
      ]
    },
    user: {
      id_str: '123',
      name: 'Michael Knepprath',
      screen_name: 'mknepprath',
    }
  },
  { // VALID BOUT START
    created_at: 'Sat Aug 19 03:55:09 +0000 2017',
    id_str: String(Math.floor(Math.random() * 100000)),
    text: '@bout_bot cHaLlEnGe @ash #throw @ignorethis',
    in_reply_to_user_id_str: '3016652708',
    entities: {
      hashtags: [
        {
          text: 'throw'
        }
      ],
      user_mentions: [
        {
          screen_name: 'bout_bot',
          name: 'Bout',
          id_str: '3016652708'
        }, {
          screen_name: 'ash',
          name: 'Ash Ketchum',
          id_str: '456'
        }, {
          screen_name: 'ignorethis',
          name: 'Ignored One',
          id_str: '789'
        }
      ]
    },
    user: {
      id_str: '123',
      name: 'Michael Knepprath',
      screen_name: 'mknepprath',
    }
  }
]

module.exports = testMentions
