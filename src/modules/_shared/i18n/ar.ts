/** ar text of `src/modules/_shared`. */

import type en from './en';

export default {
  'personalShop.needLevel': 'يتطلب المتجر الشخصي أن تبلغ الشخصية المستوى 6.',
  'personalShop.openFailed': 'تعذر فتح المتجر.',
  'personalShop.cannotSell': 'لا يمكن بيع هذا الغرض في متجر.',
  'personalShop.itemGone': 'لم يعد هذا الغرض موجودا.',
  'guild.alreadyInGuild': 'أنت عضو في نقابة بالفعل.',
  'guild.notGuildMaster': 'هذا اللاعب ليس سيد نقابة.',
  'guild.requestFailed': 'فشل طلب النقابة.',
  'quest.itemFallback': 'الغرض {id}',
  'event.shortOfZen': 'لا تملك ما يكفي من Zen.',
  'notify.negativePrice': 'لا يمكن أن يكون السعر سالبا',
} satisfies Partial<Record<keyof typeof en, string>>;
