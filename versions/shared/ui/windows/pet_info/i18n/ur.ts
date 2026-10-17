/** ur text of `versions/shared/ui/windows/pet_info`. */

import type en from './en';

export default {
  'petInfo.title': 'پالتو',
  'petInfo.darkHorse': 'Dark Horse',
  'petInfo.darkRaven': 'Dark Raven',
  'petInfo.notEquipped': 'پالتو {pet} پہنا ہوا نہیں۔',
  'petInfo.waiting': 'پالتو کی معلومات کا انتظار...',
  'petInfo.level': 'لیول {level}',
  'petInfo.life': 'زندگی {current} / {max}',
  'petInfo.exp': 'EXP {current} / {next}',
  'petInfo.damage': 'نقصان {min}~{max} (شرح {rate})',
  'petInfo.attackSpeed': 'حملے کی رفتار {speed}',
  'petInfo.defense': 'دفاع {defense}',
  'petInfo.command': 'حکم',
  'petInfo.cmdNormal': 'عام حملہ',
  'petInfo.cmdRandom': 'بے ترتیب حملہ',
  'petInfo.cmdOwner': 'مالک کے ساتھ حملہ',
  'petInfo.cmdTarget': 'ہدف پر حملہ',
} satisfies Partial<Record<keyof typeof en, string>>;
