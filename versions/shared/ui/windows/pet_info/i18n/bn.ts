/** bn text of `versions/shared/ui/windows/pet_info`. */

import type en from './en';

export default {
  'petInfo.title': 'পোষ্য',
  'petInfo.darkHorse': 'অন্ধকার ঘোড়া',
  'petInfo.darkRaven': 'অন্ধকার দাঁড়কাক',
  'petInfo.notEquipped': 'সজ্জিত নেই: {pet}।',
  'petInfo.waiting': 'পোষ্যের তথ্যের অপেক্ষা...',
  'petInfo.level': 'লেভেল {level}',
  'petInfo.life': 'জীবন {current} / {max}',
  'petInfo.exp': 'অভিজ্ঞতা {current} / {next}',
  'petInfo.damage': 'ক্ষতি {min}~{max} (হার {rate})',
  'petInfo.attackSpeed': 'আক্রমণের গতি {speed}',
  'petInfo.defense': 'প্রতিরক্ষা {defense}',
  'petInfo.command': 'আদেশ',
  'petInfo.cmdNormal': 'সাধারণ আক্রমণ',
  'petInfo.cmdRandom': 'এলোমেলো আক্রমণ',
  'petInfo.cmdOwner': 'মালিকের সাথে আক্রমণ',
  'petInfo.cmdTarget': 'লক্ষ্যে আক্রমণ',
} satisfies Partial<Record<keyof typeof en, string>>;
