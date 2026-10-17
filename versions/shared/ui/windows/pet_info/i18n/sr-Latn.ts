/** sr-Latn text of `versions/shared/ui/windows/pet_info`. */

import type en from './en';

export default {
  'petInfo.title': 'Ljubimac',
  'petInfo.darkHorse': 'Dark Horse',
  'petInfo.darkRaven': 'Dark Raven',
  'petInfo.notEquipped': 'Ljubimac {pet} nije opremljen.',
  'petInfo.waiting': 'Čekanje podataka o ljubimcu...',
  'petInfo.level': 'Nivo {level}',
  'petInfo.life': 'Život {current} / {max}',
  'petInfo.exp': 'EXP {current} / {next}',
  'petInfo.damage': 'Šteta {min}~{max} (preciznost {rate})',
  'petInfo.attackSpeed': 'Brzina napada {speed}',
  'petInfo.defense': 'Odbrana {defense}',
  'petInfo.command': 'Naredba',
  'petInfo.cmdNormal': 'Običan napad',
  'petInfo.cmdRandom': 'Nasumičan napad',
  'petInfo.cmdOwner': 'Napad sa vlasnikom',
  'petInfo.cmdTarget': 'Napadni metu',
} satisfies Partial<Record<keyof typeof en, string>>;
