/** ur text of `src/modules/_shared`. */

import type en from './en';

export default {
  'personalShop.needLevel': 'ذاتی دکان کے لیے کردار کا لیول 6 درکار ہے۔',
  'personalShop.openFailed': 'دکان نہیں کھل سکی۔',
  'personalShop.cannotSell': 'یہ آئٹم دکان میں نہیں بیچا جا سکتا۔',
  'personalShop.itemGone': 'وہ آئٹم اب موجود نہیں۔',
  'guild.alreadyInGuild': 'آپ پہلے ہی ایک گلڈ میں ہیں۔',
  'guild.notGuildMaster': 'یہ کھلاڑی گلڈ ماسٹر نہیں ہے۔',
  'guild.requestFailed': 'گلڈ کی درخواست ناکام رہی۔',
  'quest.itemFallback': 'آئٹم {id}',
  'event.shortOfZen': 'آپ کے پاس Zen کم ہے۔',
  'notify.negativePrice': 'قیمت منفی نہیں ہو سکتی',
} satisfies Partial<Record<keyof typeof en, string>>;
