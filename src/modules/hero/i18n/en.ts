/** English text of the `hero` module. See src/i18n/readme.md. */

const en = {
  'class.elf': 'Elf',

  'emote.greeting': 'Greeting',
  'emote.goodbye': 'Goodbye',
  'emote.clap': 'Clap',
  'emote.cheer': 'Cheer',
  'emote.smile': 'Smile',
  'emote.cry': 'Cry',
  'emote.respect': 'Respect',
  'emote.salute': 'Salute',
  'emote.win': 'Victory',
  'emote.gesture': 'Gesture',
  'emote.direction': 'Point',
  'emote.unknown': 'Confused',
  'emote.awkward': 'Awkward',
  'emote.see': 'Stare',
  'emote.sleep': 'Sleepy',
  'emote.cold': 'Cold',
  'emote.again': 'Again',
  'emote.rush': 'Rush',
  'emote.scissors': 'Scissors',
  'emote.rock': 'Rock',
  'emote.paper': 'Paper',
  'emote.hustle': 'Hustle',
  'emote.provocation': 'Provoke',
  'emote.lookAround': 'Look around',
  'emote.cheers': 'Cheers',
  'notify.pointNotAdded': 'Could not add the point',
  'notify.levelUp': 'Level {level}',
  'notify.masterLevelUp': 'Master level {level}',
  'notify.expGained': 'Obtained {amount} Exp',
  'notify.masterExpGained': 'Master EXP achievement {amount}',
  'notify.fruitAdd': '{stat} +{points} (fruit)',
  'notify.fruitRemove': '{stat} -{points} (fruit)',
  'notify.fruitNoEffect': 'The fruit had no effect',
  'notify.fruitLimit': 'You cannot use any more fruits today',
  'notify.fruitFloor': '{stat} cannot go any lower',
  'notify.fruitEquipped': 'Take off the items that need this stat first',
  'notify.fruitNotNow': 'You cannot use this fruit now',
  'warn.durability': 'Equipment durability at {percent}%',
  'warn.inventoryFull': 'The inventory is full',
  'warn.noPotions': 'No healing potions left',
  'warn.buffEnding': '{name} is about to end',
};

export default en;

declare module '@/i18n' {
  interface TextOwners {
    'src/modules/hero': typeof en;
  }
}
