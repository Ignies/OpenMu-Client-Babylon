/** fa text of `versions/shared/ui/windows/pet_info`. */

import type en from './en';

export default {
  'petInfo.title': 'همراه',
  'petInfo.darkHorse': 'اسب تیره',
  'petInfo.darkRaven': 'کلاغ تیره',
  'petInfo.notEquipped': 'همراه {pet} تجهیز نشده است.',
  'petInfo.waiting': 'در انتظار اطلاعات همراه...',
  'petInfo.level': 'سطح {level}',
  'petInfo.life': 'جان {current} / {max}',
  'petInfo.exp': 'تجربه {current} / {next}',
  'petInfo.damage': 'آسیب {min}~{max} (نرخ {rate})',
  'petInfo.attackSpeed': 'سرعت حمله {speed}',
  'petInfo.defense': 'دفاع {defense}',
  'petInfo.command': 'فرمان',
  'petInfo.cmdNormal': 'حمله پیش‌فرض',
  'petInfo.cmdRandom': 'حمله تصادفی',
  'petInfo.cmdOwner': 'حمله همراه صاحب',
  'petInfo.cmdTarget': 'حمله به هدف',
} satisfies Partial<Record<keyof typeof en, string>>;
