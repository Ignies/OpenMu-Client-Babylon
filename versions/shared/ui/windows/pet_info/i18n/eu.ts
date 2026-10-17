/** eu text of `versions/shared/ui/windows/pet_info`. */

import type en from './en';

export default {
  'petInfo.title': 'Maskota',
  'petInfo.darkHorse': 'Zaldi iluna',
  'petInfo.darkRaven': 'Bele iluna',
  'petInfo.notEquipped': 'Ez dago jantzita: {pet}.',
  'petInfo.waiting': 'Maskotaren informazioaren zain...',
  'petInfo.level': 'Maila {level}',
  'petInfo.life': 'Bizitza {current} / {max}',
  'petInfo.exp': 'EXP {current} / {next}',
  'petInfo.damage': 'Kaltea {min}~{max} (Tasa {rate})',
  'petInfo.attackSpeed': 'Eraso-abiadura {speed}',
  'petInfo.defense': 'Defentsa {defense}',
  'petInfo.command': 'Agindua',
  'petInfo.cmdNormal': 'Eraso lehenetsia',
  'petInfo.cmdRandom': 'Ausazko erasoa',
  'petInfo.cmdOwner': 'Jabearekin eraso',
  'petInfo.cmdTarget': 'Helburuari eraso',
} satisfies Partial<Record<keyof typeof en, string>>;
