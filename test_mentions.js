// A user challenges another user for the first time
// - Valid start tweet
// - Expect creation of new bout
// - Expect @bout_bot reply
// - Bout ID: 101112-456
const noBoutExistsInit = [
  {
    created_at: 'Sun Aug 20 02:54:09 +0000 2017',
    id_str: String(Math.floor(Math.random() * 100000)),
    text: '@bout_bot I CHALLENGE @ash #throw KERCHOW',
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
      id_str: '101112',
      name: 'McQueen',
      screen_name: 'lightning',
    }
  }
]

// A user challenges another user for the first time
// - Invalid start tweet
// - Expect no @bout_bot reply
const noBoutExistsIgnore = [
  {
    created_at: 'Sun Aug 20 02:54:09 +0000 2017',
    id_str: String(Math.floor(Math.random() * 100000)),
    text: '@bout_bot @ash howdy how I do I play this here game #towmater',
    in_reply_to_user_id_str: '3016652708',
    entities: {
      hashtags: [
        {
          text: 'towmater'
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
      id_str: '161718',
      name: 'Mater',
      screen_name: 'towmater',
    }
  }
]

// A user is currently playing against another user
// - Valid move tweet
// - Expect @bout_bot reply with damage or win status
// - Bout ID: 123-456
const boutInProgress = [
  {
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
  {
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
  {
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
  {
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

// A user challenges another user again
// - Valid start tweet
// - Expect @bout_bot reply
// - Bout ID: 456-789
const boutNotInProgress = [
  {
    created_at: 'Sun Aug 20 02:53:09 +0000 2017',
    id_str: String(Math.floor(Math.random() * 100000)),
    text: '@bout_bot CHALLENGE @ash #throw heya',
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
      id_str: '789',
      name: 'OK',
      screen_name: 'oknepprath',
    }
  }
]

// An initiation tweet for an old bout that has been completed
// - Bout not in progress, tweet id matches old bout tweet id
// - Expect no @bout_bot reply
// - Bout ID: 131415-789
const boutNotInProgressIgnore = [
  {
    created_at: 'Sun Aug 20 02:53:09 +0000 2017',
    id_str: '12345',
    text: '@bout_bot CHALLENGE @oknepprath #throw heya',
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
          screen_name: 'oknepprath',
          name: 'OK',
          id_str: '789'
        }
      ]
    },
    user: {
      id_str: '131415',
      name: 'Lamp',
      screen_name: 'nightlight',
    }
  }
]

module.exports = [
  ...noBoutExistsIgnore,
  ...noBoutExistsInit,
  ...boutInProgress,
  ...boutNotInProgress,
  ...boutNotInProgressIgnore
]
