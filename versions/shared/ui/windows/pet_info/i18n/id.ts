/** id text of `versions/shared/ui/windows/pet_info`. */

import type en from './en';

export default {
  'petInfo.title': 'Pet',
  'petInfo.darkHorse': 'Kuda Kegelapan',
  'petInfo.darkRaven': 'Gagak Kegelapan',
  'petInfo.notEquipped': '{pet} belum dipasang.',
  'petInfo.waiting': 'Menunggu info pet...',
  'petInfo.level': 'Level {level}',
  'petInfo.life': 'Nyawa {current} / {max}',
  'petInfo.exp': 'EXP {current} / {next}',
  'petInfo.damage': 'Damage {min}~{max} (Akurasi {rate})',
  'petInfo.attackSpeed': 'Kecepatan Serang {speed}',
  'petInfo.defense': 'Pertahanan {defense}',
  'petInfo.command': 'Perintah',
  'petInfo.cmdNormal': 'Serangan biasa',
  'petInfo.cmdRandom': 'Serangan acak',
  'petInfo.cmdOwner': 'Serang bersama tuan',
  'petInfo.cmdTarget': 'Serang sasaran',
} satisfies Partial<Record<keyof typeof en, string>>;
