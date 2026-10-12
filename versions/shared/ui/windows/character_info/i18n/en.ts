/** English text of the `character_info` window. See src/i18n/readme.md. */

const en = {
  'stat.short.strength': 'STR',
  'stat.short.agility': 'AGI',
  'stat.short.vitality': 'STA',
  'stat.short.energy': 'ENG',
  'charInfo.dmgRate': 'Dmg(rate): {min}~{max} ({rate})',
  'charInfo.dmg': 'Dmg: {min}~{max}',
  'charInfo.attackRate': 'Attack rate: {value}',
  'charInfo.attackRateBonus': 'Attack rate: {value} (+{bonus})',
  'charInfo.defenseRateFull': 'Defense (rate):{defense} ({rate} +{bonus})',
  'charInfo.defenseRate': 'Defense (rate):{defense} ({rate})',
  'charInfo.defenseFull': 'Defense: {defense} (+{bonus})',
  'charInfo.defense': 'Defense: {defense}',
  'charInfo.attackSpeed': 'Attack speed: {value}',
  'charInfo.defenseRatePvp': 'Defense rate: {value}',
  'charInfo.defenseRatePvpBonus': 'Defense rate: {value} (+{bonus})',
  'charInfo.hp': 'HP: {current} / {max}',
  'charInfo.meleeDamage': 'Melee Damage: {value}%',
  'charInfo.mana': 'Mana: {current} / {max}',
  'charInfo.wizardryRate': 'Wizardry Dmg: {min}~{max} (+{rate})',
  'charInfo.wizardry': 'Wizardry Dmg: {min}~{max}',
  'charInfo.curseSpell': ' Curse Spell: {min} ~ {max}',
  'charInfo.curseSpellRate': ' Curse Spell: {min} ~ {max}(+{rate})',
  'charInfo.skillDamage': 'Skill Damage: {value}%',
  'charInfo.divineDamage': 'Divine Damage (Roar, Slasher): {value}%',
  'charInfo.aoeDamage': 'AOE Damage (Dark Side): {value}%',
  'charInfo.addAmount': 'Points to add',
  'charInfo.stopAdding': 'Stop',

  'characterInfo.title': 'Character',
  'characterInfo.close': 'Close (C)',
  'characterInfo.quest': 'Quest(T)',
  'characterInfo.pet': 'Pet',
  'characterInfo.masterTree': 'Master skill tree (A)',
};

export default en;

declare module '@/i18n' {
  interface TextOwners {
    'versions/shared/ui/windows/character_info': typeof en;
  }
}
