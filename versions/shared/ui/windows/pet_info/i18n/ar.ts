/** ar text of `versions/shared/ui/windows/pet_info`. */

import type en from './en';

export default {
  'petInfo.title': 'الحيوان الأليف',
  'petInfo.darkHorse': 'Dark Horse',
  'petInfo.darkRaven': 'Dark Raven',
  'petInfo.notEquipped': 'الحيوان الأليف {pet} غير مجهّز.',
  'petInfo.waiting': 'في انتظار معلومات الحيوان الأليف...',
  'petInfo.level': 'المستوى {level}',
  'petInfo.life': 'الحياة {current} / {max}',
  'petInfo.exp': 'الخبرة {current} / {next}',
  'petInfo.damage': 'الضرر {min}~{max} (النسبة {rate})',
  'petInfo.attackSpeed': 'سرعة الهجوم {speed}',
  'petInfo.defense': 'الدفاع {defense}',
  'petInfo.command': 'الأمر',
  'petInfo.cmdNormal': 'هجوم افتراضي',
  'petInfo.cmdRandom': 'هجوم عشوائي',
  'petInfo.cmdOwner': 'الهجوم مع المالك',
  'petInfo.cmdTarget': 'مهاجمة الهدف',
} satisfies Partial<Record<keyof typeof en, string>>;
