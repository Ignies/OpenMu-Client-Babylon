/** ar text of `versions/shared/ui/windows/economy_prompts`. */

import type en from './en';

export default {
  'prompt.storeZen': 'إيداع Zen',
  'prompt.takeZen': 'سحب Zen',
  'prompt.unlockVault': 'فتح قفل الخزنة',
  'prompt.enterPin': 'أدخل رمز الخزنة.',
  'prompt.setPin': 'تعيين رمز للخزنة',
  'prompt.removePin': 'إزالة رمز الخزنة',
  'prompt.removePinHint': 'إزالة الرمز تتطلب كلمة مرور حسابك.',
  'prompt.offerZen': 'عرض Zen',
  'prompt.setPrice': 'تحديد السعر',
  'prompt.askingPrice': 'السعر المطلوب.',
  'prompt.askingPriceFor': 'السعر المطلوب للغرض {name}.',
  'prompt.buy': 'شراء',
  'prompt.itemCosts': 'سعر {name}: {price}.',
  'prompt.thisItem': 'هذا الغرض',
  'prompt.itemGone': 'لم يعد هذا الغرض موجودا.',
  'prompt.buyHowMany': 'كم قطعة من {name}؟ سعر القطعة {price}.',
  'prompt.quantity': 'الكمية',
  'prompt.carrying': 'تحمل معك {amount}.',
  'prompt.vaultHolds': 'في الخزنة {amount}.',
  'prompt.newPinHint': 'الرمز الجديد يتطلب كلمة مرور حسابك.',
  'prompt.pin': 'الرمز',
  'prompt.password': 'كلمة المرور',
  'prompt.wantsToTrade': 'يريد اللاعب {name} التبادل معك.',
} satisfies Partial<Record<keyof typeof en, string>>;
