const { random } = require('./utils')
const {
  REPLY_TYPES: {
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

const genReply = (
  type,
  replyData = {}
) => {
  const {
    playerName,
    damage,
    health,
    attemptedMove,
    nextPlayerName
  } = replyData
  const REPLIES = {
    [YOU_WIN]: [
      'You win! ',
      'You are the victor! ',
      'Game over, you win! ',
      'That\'s the game, you win! '
    ],
    [MOVE_SUCCESS]: [
      `Wow! ${playerName} took ${damage} damage. ${health} health remaining. `,
      `${playerName} tried to dodge, but took ${damage} damage. ${health} health remaining. `,
      `You successfully hit ${playerName} for ${damage} points of damage. ${health} health remaining. `,
      `Hit! ${playerName} has ${health} health left after taking ${damage} damage. `,
      `${playerName} did not like that. ${damage} damage, ${health} health remaining. `,
      `Down, but not out! ${playerName} takes ${damage} damage and has ${health} health left. `,
      `That did it. ${playerName} has ${health} health left after taking ${damage} damage. `
    ],
    [MOVE_FAILED]: [
      'Your attack missed. ',
      'You missed! ',
      'You failed to hit your target. ',
      'You trip over a rock. ',
      'You miss, but barely. ',
      'You miss and hit a tree. ',
      'It looked good, but you missed. ',
      'They dodged the attack! '
    ],
    [MOVE_INVALID]: [
      `Epic fail! You do not have the move "${attemptedMove}". `,
      `You don't have the move "${attemptedMove}". `,
      `You can't use "${attemptedMove}" because you don't have it. `,
      `Nice try, but you don't have "${attemptedMove}". `
    ],
    [NO_MOVE]: [
      'No move detected... ',
      'No valid move found in this tweet. ',
      'What attack will you use? ',
      'What move will you use? '
    ],
    [NEXT_TURN]: [
      `Your move, @${nextPlayerName}!`,
      `It's your turn, @${nextPlayerName}.`,
      `Make your move, @${nextPlayerName}!`,
      `Wow. Well, now it's @${nextPlayerName}'s turn.`,
      `@${nextPlayerName}'s turn.`,
      `@${nextPlayerName}'s move!`,
      `Next up: @${nextPlayerName}!`
    ],
    [TRY_AGAIN]: [
      `It's your turn! @${nextPlayerName} is waiting.`,
      `It's your turn, make a move! @${nextPlayerName} appears to be losing their patience.`,
      `Take your turn, or it will become @${nextPlayerName}'s turn!`,
      `@${nextPlayerName} wants to go, but you have to make your move first.`
    ],
    [YOU_LOSE]: [
      `Better luck next time, @${nextPlayerName}.`,
      `You'll get 'em next time, @${nextPlayerName}!`,
      `Shoot, I was rooting for @${nextPlayerName}!`,
      `It was close, @${nextPlayerName}. Next time!`,
      `@${nextPlayerName} was close, though!`,
      `With a little training, you'll win next time @${nextPlayerName}!`,
      `It was anyone's game. I sense a comeback, @${nextPlayerName}!`
    ]
  }

  return random(REPLIES[type])
}

module.exports = { genReply }
