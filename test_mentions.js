const test_mentions = [
  { // ASH FIRST ATTACK
    created_at: 'Sun Aug 20 03:55:09 +0000 2017',
    id_str: '1000002',
    text: '@bout_bot @mknepprath #throw',
    in_reply_to_user_id_str: '2578652522',
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
          id_str: '2578652522'
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
    text: '@bout_bot @mknepprath throw?',
    in_reply_to_user_id_str: '2578652522',
    entities: {
      hashtags: [],
      user_mentions: [
        {
          screen_name: 'bout_bot',
          name: 'Bout',
          id_str: '2578652522'
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
    id_str: '1000000',
    text: '@bout_bot @ash #punch',
    in_reply_to_user_id_str: '2578652522',
    entities: {
      hashtags: [
        {
          text: 'punch'
        }
      ],
      user_mentions: [
        {
          screen_name: 'bout_bot',
          name: 'Bout',
          id_str: '2578652522'
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
    id_str: '999999',
    text: '@bout_bot cHaLlEnGe @ash #swing @ignorethis',
    in_reply_to_user_id_str: '2578652522',
    entities: {
      hashtags: [
        {
          text: 'swing'
        }
      ],
      user_mentions: [
        {
          screen_name: 'bout_bot',
          name: 'Bout',
          id_str: '2578652522'
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

module.exports = test_mentions
