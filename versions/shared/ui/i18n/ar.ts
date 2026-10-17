/** ar text of `versions/shared/ui`. */

import type en from './en';

export default {
  'servers.loading': 'جار تحميل قائمة الخوادم...',
  'servers.serverName': 'الخادم {number}',
  'login.id': 'ID',
  'login.password': 'كلمة المرور',
  'options.title': 'الخيارات',
  'options.texturePack': 'أنسجة النماذج',
  'options.texturePack.original': 'الأصلية',
  'options.texturePackHint': 'أنسجة نماذج بدقة أعلى، تطبّق دون إعادة التحميل',
  'session.toLevel': 'للمستوى التالي',
  'bottomBar.pet.normalTip': 'افتراضي: يبقى الغراب معك',
  'bottomBar.pet.randomTip': 'عشوائي: يهاجم أي شيء قريب',
  'bottomBar.pet.ownerTip': 'المالك: يهاجم ما تهاجمه',
  'bottomBar.pet.targetTip': 'الهدف: يهاجم هدفك الحالي',
  'skills.title': 'المهارات',
  'skills.empty': 'لم تتعلم أي مهارة',
  'chatRoom.leave': 'مغادرة',
  'command.trade': 'تبادل',
  'command.purchase': 'شراء',
  'command.party': 'فريق',
  'command.whisper': 'همس',
  'command.follow': 'اتباع',
  'command.battle': 'قتال',
  'warp.title': 'نافذة أمر الانتقال',
  'instrument.putAway': 'إبعاد الآلة',
  'prompt.trade': 'التبادل',
} satisfies Partial<Record<keyof typeof en, string>>;
