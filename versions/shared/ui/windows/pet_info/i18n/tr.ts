/** tr text of `versions/shared/ui/windows/pet_info`. */

import type en from './en';

export default {
  'petInfo.title': 'Pet',
  'petInfo.darkHorse': 'Kara At',
  'petInfo.darkRaven': 'Kara Kuzgun',
  'petInfo.notEquipped': 'Kuşanılmadı: {pet}',
  'petInfo.waiting': 'Pet bilgisi bekleniyor...',
  'petInfo.level': 'Seviye {level}',
  'petInfo.life': 'Can {current} / {max}',
  'petInfo.exp': 'Exp {current} / {next}',
  'petInfo.damage': 'Hasar {min}~{max} (Oran {rate})',
  'petInfo.attackSpeed': 'Saldırı hızı {speed}',
  'petInfo.defense': 'Savunma {defense}',
  'petInfo.command': 'Komut',
  'petInfo.cmdNormal': 'Normal saldırı',
  'petInfo.cmdRandom': 'Rastgele saldırı',
  'petInfo.cmdOwner': 'Sahiple birlikte saldır',
  'petInfo.cmdTarget': 'Hedefe saldır',
} satisfies Partial<Record<keyof typeof en, string>>;
