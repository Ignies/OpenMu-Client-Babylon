/** hi text of `src/app`. */

import type en from './en';

export default {
  'notify.wsError': 'WebSocket कनेक्शन त्रुटि',
  'notify.connectionLost': 'सर्वर से कनेक्शन टूट गया',
  'notify.serverListLost': 'सर्वर सूची से कनेक्शन टूट गया',
  'notify.helperStarted': 'MU Helper शुरू हुआ',
  'notify.helperStopped': 'MU Helper बंद हुआ',
  'notify.helperSafeZone': 'MU Helper सुरक्षित क्षेत्र में शुरू नहीं हो सकता',
  'notify.helperCost': 'MU Helper ने {total} Zen खर्च किए',
  'notify.zenCap': 'आप 2,000,000,000 Zen से ज़्यादा नहीं रख सकते',
  'notify.cannotSell': 'यह आइटम बेचा नहीं जा सकता',
  'notify.merchantRefuses': 'व्यापारी को वह आइटम नहीं चाहिए',
  'notify.learnedSkill': 'आपने स्किल {name} सीख ली है',
  'notify.storageOpen': 'तिजोरी खुली होने पर आप आइटम इस्तेमाल नहीं कर सकते',
  'notify.upgradeNeedsServer': 'अपग्रेड के लिए सर्वर चाहिए',
  'notify.noAnswerRestored': 'सर्वर ने जवाब नहीं दिया - आइटम वापस रखा गया',
  'notify.cannotBuy': 'आप वह आइटम नहीं खरीद सकते',
} satisfies Partial<Record<keyof typeof en, string>>;
