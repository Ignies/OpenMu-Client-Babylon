/** fil text of `versions/shared/ui/windows/pet_info`. */

import type en from './en';

export default {
  'petInfo.title': 'Pet',
  'petInfo.darkHorse': 'Dark Horse',
  'petInfo.darkRaven': 'Dark Raven',
  'petInfo.notEquipped': 'Hindi naka-equip ang {pet}.',
  'petInfo.waiting': 'Hinihintay ang impormasyon ng pet...',
  'petInfo.level': 'Level {level}',
  'petInfo.life': 'Buhay {current} / {max}',
  'petInfo.exp': 'EXP {current} / {next}',
  'petInfo.damage': 'Pinsala {min}~{max} (Antas {rate})',
  'petInfo.attackSpeed': 'Bilis ng Atake {speed}',
  'petInfo.defense': 'Depensa {defense}',
  'petInfo.command': 'Utos',
  'petInfo.cmdNormal': 'Karaniwang atake',
  'petInfo.cmdRandom': 'Random na atake',
  'petInfo.cmdOwner': 'Umatake kasama ng amo',
  'petInfo.cmdTarget': 'Atakihin ang target',
} satisfies Partial<Record<keyof typeof en, string>>;
