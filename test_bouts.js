const boutInProgress = {
  tweet_id: '47990',
  in_progress: true,
  bout_id: '123-456',
  player_data: {
    players: [
      {
        item: 'rock',
        name: 'Michael Knepprath',
        turn: true,
        health: 12,
        id_str: '123',
        strike: 0,
        tweet_id: '18',
        screen_name: 'mknepprath'
      },
      {
        item: 'rock',
        name: 'Ash Ketchum',
        turn: false,
        health: 4,
        id_str: '456',
        strike: 0,
        tweet_id: '77204',
        screen_name: 'ash'
      }
    ]
  }
}

const boutNotInProgress = {
  tweet_id: '61695',
  in_progress: false,
  bout_id: '456-789',
  player_data: {
    players: [
      {
        item: 'stick',
        name: 'OK',
        turn: false,
        health: 12,
        id_str: '789',
        strike: 0,
        tweet_id: '54786',
        screen_name: 'oknepprath'
      },
      {
        item: 'rock',
        name: 'Ash Ketchum',
        turn: true,
        health: 12,
        id_str: '456',
        strike: 0,
        tweet_id: '',
        screen_name: 'ash'
      }
    ]
  }
}

const boutNotInProgressIgnore = {
  tweet_id: '12345',
  in_progress: false,
  bout_id: '131415-789',
  player_data: {
    players: [
      {
        item: 'stick',
        name: 'OK',
        turn: false,
        health: 12,
        id_str: '789',
        strike: 0,
        tweet_id: '54786',
        screen_name: 'oknepprath'
      },
      {
        item: 'rock',
        name: 'Lamp',
        turn: true,
        health: 12,
        id_str: '131415',
        strike: 0,
        tweet_id: '',
        screen_name: 'nightlight'
      }
    ]
  }
}

module.exports = [
  boutInProgress,
  boutNotInProgress,
  boutNotInProgressIgnore
]
