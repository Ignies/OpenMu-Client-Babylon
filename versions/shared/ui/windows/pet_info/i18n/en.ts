/** English text of the `pet_info` window. See src/i18n/readme.md. */

const en = {
  // GlobalText 1217 / 1187 / 1214 / 1218-1222 (`CNewUIPetInfoWindow`).
  'petInfo.title': 'Pet',
  'petInfo.darkHorse': 'Dark Horse',
  'petInfo.darkRaven': 'Dark Raven',
  'petInfo.notEquipped': '{pet} is not equipped.',
  'petInfo.waiting': 'Waiting for the pet info...',
  'petInfo.level': 'Level {level}',
  'petInfo.life': 'Life {current} / {max}',
  'petInfo.exp': 'Exp {current} / {next}',
  'petInfo.damage': 'Damage {min}~{max} (Rate {rate})',
  'petInfo.attackSpeed': 'Attack speed {speed}',
  'petInfo.defense': 'Defense {defense}',
  'petInfo.command': 'Command',
  'petInfo.cmdNormal': 'Default attack',
  'petInfo.cmdRandom': 'Random attack',
  'petInfo.cmdOwner': 'Attack with owner',
  'petInfo.cmdTarget': 'Attack target',
  'petInfo.close': 'Close',
};

export default en;

declare module '@/i18n' {
  interface TextOwners {
    'versions/shared/ui/windows/pet_info': typeof en;
  }
}
