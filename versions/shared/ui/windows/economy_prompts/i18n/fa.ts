/** fa text of `versions/shared/ui/windows/economy_prompts`. */

import type en from './en';

export default {
  'prompt.storeZen': 'سپردن Zen',
  'prompt.takeZen': 'برداشتن Zen',
  'prompt.unlockVault': 'باز کردن قفل انبار',
  'prompt.enterPin': 'رمز انبار را وارد کنید.',
  'prompt.setPin': 'تعیین رمز انبار',
  'prompt.removePin': 'حذف رمز انبار',
  'prompt.removePinHint': 'حذف رمز به رمز عبور حساب شما نیاز دارد.',
  'prompt.offerZen': 'پیشنهاد Zen',
  'prompt.setPrice': 'تعیین قیمت',
  'prompt.askingPrice': 'قیمت درخواستی.',
  'prompt.askingPriceFor': 'قیمت درخواستی برای {name}.',
  'prompt.buy': 'خرید',
  'prompt.itemCosts': 'قیمت {name}: {price}.',
  'prompt.thisItem': 'این آیتم',
  'prompt.itemGone': 'این آیتم دیگر نیست.',
  'prompt.buyHowMany': 'چند عدد {name}؟ هر عدد {price}.',
  'prompt.quantity': 'تعداد',
  'prompt.carrying': 'همراه شما: {amount}.',
  'prompt.vaultHolds': 'موجودی انبار: {amount}.',
  'prompt.newPinHint': 'رمز تازه به رمز عبور حساب شما نیاز دارد.',
  'prompt.pin': 'رمز',
  'prompt.password': 'رمز عبور',
  'prompt.wantsToTrade': 'بازیکن {name} می‌خواهد با شما معامله کند.',
} satisfies Partial<Record<keyof typeof en, string>>;
