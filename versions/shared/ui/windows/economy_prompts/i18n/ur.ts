/** ur text of `versions/shared/ui/windows/economy_prompts`. */

import type en from './en';

export default {
  'prompt.storeZen': 'Zen جمع کریں',
  'prompt.takeZen': 'Zen نکالیں',
  'prompt.unlockVault': 'تجوری کھولیں',
  'prompt.enterPin': 'تجوری کا PIN درج کریں۔',
  'prompt.setPin': 'تجوری کا PIN مقرر کریں',
  'prompt.removePin': 'تجوری کا PIN ہٹائیں',
  'prompt.removePinHint': 'تجوری کا PIN ہٹانے کے لیے آپ کے اکاؤنٹ کا پاس ورڈ درکار ہے۔',
  'prompt.offerZen': 'Zen پیش کریں',
  'prompt.setPrice': 'قیمت مقرر کریں',
  'prompt.askingPrice': 'مانگی گئی قیمت۔',
  'prompt.askingPriceFor': 'آئٹم {name} کی مانگی گئی قیمت۔',
  'prompt.buy': 'خریدیں',
  'prompt.itemCosts': 'آئٹم {name} کی قیمت: {price}۔',
  'prompt.thisItem': 'یہ آئٹم',
  'prompt.itemGone': 'یہ آئٹم اب موجود نہیں۔',
  'prompt.buyHowMany': 'آئٹم {name} کتنے؟ فی عدد {price}۔',
  'prompt.quantity': 'تعداد',
  'prompt.carrying': 'آپ کے پاس {amount} ہے۔',
  'prompt.vaultHolds': 'تجوری میں {amount} ہے۔',
  'prompt.newPinHint': 'نئے PIN کے لیے آپ کے اکاؤنٹ کا پاس ورڈ درکار ہے۔',
  'prompt.pin': 'PIN',
  'prompt.password': 'پاس ورڈ',
  'prompt.wantsToTrade': 'کھلاڑی {name} آپ سے تجارت کرنا چاہتا ہے۔',
} satisfies Partial<Record<keyof typeof en, string>>;
