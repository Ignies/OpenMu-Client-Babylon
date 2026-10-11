/** English text of the `skills` module. See src/i18n/readme.md. */

const en = {
  'skills.teachesNothing': 'This item teaches no skill',
  'skills.thisSkill': 'this skill',
  'skills.classCannotLearn': 'Your class cannot learn {name}',
  'skills.alreadyKnown': 'You already know {name}',
  'skills.needMore':
    '{label} {required} required to learn {name} ({more} more needed)',

  'master.nextLevel': 'Next Level:',
  'master.requirements': 'Requirements:',
  'master.maxed': "You can't raise any more levels.",
  'master.unmet': 'You must meet all skill requirements.',
  'master.equipment':
    'You need to wear the required equipment to level up this skill.',
  'master.masterLevel': 'Master level: %d',
  'master.levelPoints': 'Level point: %d',
  'master.expPercent': 'EXP: %6.2f%%',
  'master.expTip': 'EXP:%I64d / %I64d',
  'master.category.peace': 'Peace',
  'master.category.wisdom': 'Wisdom',
  'master.category.overcome': 'Overcome',
  'master.category.protection': 'Protection',
  'master.category.bravery': 'Bravery',
  'master.category.anger': 'Anger',
  'master.category.blessing': 'Blessing',
  'master.category.salvation': 'Salvation',
  'master.category.storm': 'Storm',
  'master.category.solidity': 'Solidity',
  'master.category.fightingSpirit': 'Fighting Spirit',
  'master.category.ultimatum': 'Ultimatum',
  'master.category.determination': 'Determination',
  'master.category.justice': 'Justice',
  'master.category.conquer': 'Conquer',
  'master.category.guardian': 'Guardian',
  'master.category.chaos': 'Chaos',
  'master.category.honor': 'Honor',
  'master.category.willpower': 'Willpower',
  'master.category.destruction': 'Destruction',

  'buff.greaterDamage': 'Greater Damage',
  'buff.greaterDefense': 'Greater Defense',
  'buff.elfSoldier': 'Elf Soldier Buff',
  'buff.soulBarrier': 'Soul Barrier',
  'buff.criticalDamage': 'Critical Damage Increase',
  'buff.infiniteArrow': 'Infinity Arrow',
  'buff.agRecovery': 'AG Recovery Speed',
  'buff.greaterFortitude': 'Greater Fortitude',
  'buff.eliteManaPotion': 'Elite Mana Potion',
  'buff.potionOfBless': 'Potion of Bless',
  'buff.potionOfSoul': 'Potion of Soul',
  'buff.ignoreDefense': 'Ignore Defense',
  'buff.increaseHealth': 'Increase Health',
  'buff.increaseBlock': 'Increase Block',
  'buff.decreaseBlock': 'Decrease Block',
  'buff.shieldSkill': 'Shield Skill',
  'buff.alcohol': 'Alcohol',
  'buff.unnamed': 'Effect {number}',
};

export default en;

declare module '@/i18n' {
  interface TextOwners {
    'src/modules/skills': typeof en;
  }
}
