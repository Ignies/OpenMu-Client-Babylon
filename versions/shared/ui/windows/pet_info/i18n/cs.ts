/** cs text of `versions/shared/ui/windows/pet_info`. */

import type en from './en';

export default {
  'petInfo.title': 'Mazlíček',
  'petInfo.darkHorse': 'Temný oř',
  'petInfo.darkRaven': 'Temný havran',
  'petInfo.notEquipped': 'Mazlíček {pet} není nasazen.',
  'petInfo.waiting': 'Čekání na údaje o mazlíčkovi...',
  'petInfo.level': 'Úroveň {level}',
  'petInfo.life': 'Život {current} / {max}',
  'petInfo.exp': 'EXP {current} / {next}',
  'petInfo.damage': 'Poškození {min}~{max} (úspěšnost {rate})',
  'petInfo.attackSpeed': 'Rychlost útoku {speed}',
  'petInfo.defense': 'Obrana {defense}',
  'petInfo.command': 'Rozkaz',
  'petInfo.cmdNormal': 'Výchozí útok',
  'petInfo.cmdRandom': 'Náhodný útok',
  'petInfo.cmdOwner': 'Útok s pánem',
  'petInfo.cmdTarget': 'Útok na cíl',
} satisfies Partial<Record<keyof typeof en, string>>;
