/** English text of the `skill_tooltip` interface widget. See src/i18n/readme.md. */

const en = {
  'skills.tooltip.unknown': 'Unknown skill',
  'skills.tooltip.class': 'Cannot be used by your class',
  'skills.tooltip.weapon': 'Requires the weapon that carries it',
  'skills.tooltip.cooldown': 'Not ready yet',
  'skills.tooltip.level': 'Requires level {level}',
  'skills.tooltip.energy': 'Requires energy {energy}',
  'skills.tooltip.mana': 'Not enough mana ({mana})',
  'skills.tooltip.ag': 'Not enough AG ({ag})',
  'skills.tooltip.safezone': 'Cannot be used in a safe zone',
  'skills.unnamed': 'Skill #{number}',
  'skills.named': '{name} (Lv.{level})',
  'skills.damage': 'Skill damage +{value}',
  'skills.distance': 'Distance: {value}',
  'skills.mana': 'Mana: {value}',
  'skills.ag': 'AG: {value}',
  'skills.readyIn': 'Ready in {seconds} s',
  'skills.delay': 'Delay: {seconds} s',
};

export default en;

declare module '@/i18n' {
  interface TextOwners {
    'src/controllers/interface/components/skill_tooltip': typeof en;
  }
}
