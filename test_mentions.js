const test_mentions = [
  {
    created_at: 'Sun Aug 20 03:55:09 +0000 2017', // USED
    id_str: '1000001', // USED
    text: '@bout_bot @mknepprath #throw', // USED
    in_reply_to_user_id_str: '2578652522', // USED
    entities: {
      hashtags: [
        {
          text: 'throw'
        }
      ], // USED
      user_mentions: [
        {
          screen_name: 'bout_bot', // USED
          name: 'Bout',
          id_str: '2578652522' // USED
        }, {
          screen_name: 'mknepprath', // USED
          name: 'Michael Knepprath',
          id_str: '123' // USED
        }
      ] // USED
    },
    user: {
      id_str: '456', // USED
      name: 'Ash Ketchum', // USED
      screen_name: 'ash', // USED
    }
  },
  {
    created_at: 'Sat Aug 19 03:55:10 +0000 2017', // USED
    id_str: '1000000', // USED
    text: '@bout_bot @ash #slash', // USED
    in_reply_to_user_id_str: '2578652522', // USED
    entities: {
      hashtags: [
        {
          text: 'slash'
        }
      ], // USED
      user_mentions: [
        {
          screen_name: 'bout_bot', // USED
          name: 'Bout',
          id_str: '2578652522' // USED
        }, {
          screen_name: 'ash', // USED
          name: 'Ash Ketchum',
          id_str: '456' // USED
        }
      ] // USED
    },
    user: {
      id_str: '123', // USED
      name: 'Michael Knepprath', // USED
      screen_name: 'mknepprath', // USED
    }
  },
  {
    created_at: 'Sat Aug 19 03:55:09 +0000 2017', // USED
    id_str: '999999', // USED
    text: '@bout_bot challenge @ash #swing', // USED
    in_reply_to_user_id_str: '2578652522', // USED
    entities: {
      hashtags: [
        {
          text: 'swing'
        }
      ], // USED
      user_mentions: [
        {
          screen_name: 'bout_bot', // USED
          name: 'Bout',
          id_str: '2578652522' // USED
        }, {
          screen_name: 'ash', // USED
          name: 'Ash Ketchum',
          id_str: '456' // USED
        }
      ] // USED
    },
    user: {
      id_str: '123', // USED
      name: 'Michael Knepprath', // USED
      screen_name: 'mknepprath', // USED
    }
  }
]

module.exports = test_mentions
