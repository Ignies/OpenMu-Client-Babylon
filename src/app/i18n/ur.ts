/** ur text of `src/app`. */

import type en from './en';

export default {
  'notify.wsError': 'WebSocket کنکشن میں خرابی',
  'notify.connectionLost': 'سرور سے کنکشن ٹوٹ گیا',
  'notify.serverListLost': 'سرور فہرست سے کنکشن ٹوٹ گیا',
  'notify.helperStarted': 'MU Helper شروع ہو گیا',
  'notify.helperStopped': 'MU Helper رک گیا',
  'notify.helperSafeZone': 'محفوظ علاقے میں MU Helper شروع نہیں ہو سکتا',
  'notify.helperCost': 'MU Helper نے {total} Zen خرچ کیے',
  'notify.zenCap': 'آپ 2,000,000,000 Zen سے زیادہ نہیں اٹھا سکتے',
  'notify.cannotSell': 'یہ آئٹم بیچا نہیں جا سکتا',
  'notify.merchantRefuses': 'سوداگر یہ آئٹم نہیں لینا چاہتا',
  'notify.learnedSkill': 'آپ نے سکل سیکھ لی: {name}',
  'notify.storageOpen': 'تجوری کھلی ہو تو آپ آئٹم استعمال نہیں کر سکتے',
  'notify.upgradeNeedsServer': 'اپ گریڈ کے لیے سرور درکار ہے',
  'notify.noAnswerRestored': 'سرور نے جواب نہیں دیا - آئٹم واپس کر دیا گیا',
  'notify.cannotBuy': 'آپ یہ آئٹم نہیں خرید سکتے',
  'notify.updateAvailable': 'نیا ورژن آ گیا ہے: سرور فہرست پر واپس آتے ہی صفحہ دوبارہ لوڈ ہو گا۔',
} satisfies Partial<Record<keyof typeof en, string>>;
