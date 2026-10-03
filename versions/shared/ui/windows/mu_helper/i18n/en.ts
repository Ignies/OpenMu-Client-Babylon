/** English text of the `mu_helper` window. See src/i18n/readme.md. */

const en = {
  'muHelper.title': 'MU Helper',
  'muHelper.tabHunt': 'Hunt',
  'muHelper.tabObtain': 'Obtain',
  'muHelper.huntRange': 'Hunting range',
  'muHelper.obtainRange': 'Obtaining range',
  'muHelper.returnToPosition': 'Return to original position',
  'muHelper.awaySeconds': 'Away time (s)',
  'muHelper.longRange': 'Counter long-range attacks',
  'muHelper.basicSkill': 'Basic skill',
  'muHelper.activationSkill': 'Skill {index}',
  'muHelper.timer': 'Delay (s)',
  'muHelper.condition': 'Condition',
  'muHelper.basisNearby': 'Mobs nearby',
  'muHelper.basisAttacking': 'Mobs attacking',
  'muHelper.minMobs': '{count}+ mobs',
  'muHelper.combo': 'Use combo',
  'muHelper.buffs': 'Buff skills',
  'muHelper.buffDuration': 'Recast only when the buff drops',
  'muHelper.buffDurationParty': 'Same for party buffs',
  'muHelper.buffInterval': 'Recast every (s)',
  'muHelper.supportParty': 'Support party members',
  'muHelper.autoHeal': 'Auto heal',
  'muHelper.partyHeal': 'Heal party members',
  'muHelper.potion': 'Use HP potion',
  'muHelper.atPercentHp': 'at {percent}% HP',
  'muHelper.drainLife': 'Use Drain Life',
  'muHelper.useRaven': 'Use Dark Raven',
  'muHelper.ravenCease': 'Cease attack',
  'muHelper.ravenAuto': 'Attack freely',
  'muHelper.ravenTogether': 'Attack together',
  'muHelper.repair': 'Auto repair equipment',
  'muHelper.pickAll': 'Pick up all items',
  'muHelper.pickSelected': 'Pick up selected items:',
  'muHelper.pickJewel': 'Jewels & gems',
  'muHelper.pickAncient': 'Ancient items',
  'muHelper.pickZen': 'Zen',
  'muHelper.pickExcellent': 'Excellent items',
  'muHelper.pickExtra': 'Extra items:',
  'muHelper.itemName': 'Item name',
  'muHelper.addItem': 'Add',
  'muHelper.removeItem': 'Remove',
  'muHelper.pickSkill': 'Pick a skill',
  'muHelper.noSkills': 'No usable skills learned',
  'muHelper.none': 'None',
  'muHelper.save': 'Save',
  'muHelper.init': 'Init',
};

export default en;

declare module '@/i18n' {
  interface TextOwners {
    'versions/shared/ui/windows/mu_helper': typeof en;
  }
}
