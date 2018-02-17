const items = {
  fists: [
    {
      id: 'punch',
      minDamage: 1,
      maxDamage: 3,
      accuracy: 1
    },
    {
      id: 'jab',
      minDamage: 2,
      maxDamage: 2,
      accuracy: 1
    },
    {
      id: 'uppercut',
      minDamage: 0,
      maxDamage: 0,
      accuracy: 1,
      condition: {
        knocked_out: 2
      }
    }
  ],
  stick: [
    {
      id: 'swing',
      minDamage: 1,
      maxDamage: 4,
      accuracy: 0.8
    },
    {
      id: 'swipe',
      minDamage: 2,
      maxDamage: 4,
      accuracy: 0.75
    }
  ],
  rock: [
    {
      id: 'throw',
      minDamage: 1,
      maxDamage: 5,
      accuracy: 0.65
    },
    {
      id: 'smash',
      minDamage: 3,
      maxDamage: 6,
      accuracy: 0.5
    }
  ],
  sword: [
    {
      id: 'slash',
      minDamage: 2,
      maxDamage: 6,
      accuracy: 0.5
    },
    {
      id: 'lunge',
      minDamage: 3,
      maxDamage: 4,
      accuracy: 0.7,
      recoil: {
        sleep: 1
      }
    }
  ]
}

module.exports = items
