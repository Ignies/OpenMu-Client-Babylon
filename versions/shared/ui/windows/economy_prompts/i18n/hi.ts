/** hi text of `versions/shared/ui/windows/economy_prompts`. */

import type en from './en';

export default {
  'prompt.storeZen': 'Zen जमा करें',
  'prompt.takeZen': 'Zen निकालें',
  'prompt.unlockVault': 'तिजोरी खोलें',
  'prompt.enterPin': 'तिजोरी का PIN डालें।',
  'prompt.setPin': 'तिजोरी का PIN सेट करें',
  'prompt.removePin': 'तिजोरी का PIN हटाएं',
  'prompt.removePinHint': 'PIN हटाने के लिए आपके अकाउंट का पासवर्ड चाहिए।',
  'prompt.offerZen': 'Zen पेश करें',
  'prompt.setPrice': 'कीमत तय करें',
  'prompt.askingPrice': 'मांगी गई कीमत।',
  'prompt.askingPriceFor': '{name}: मांगी गई कीमत।',
  'prompt.buy': 'खरीदें',
  'prompt.itemCosts': '{name}: कीमत {price}।',
  'prompt.thisItem': 'यह आइटम',
  'prompt.itemGone': 'यह आइटम अब नहीं है।',
  'prompt.buyHowMany': '{name}: कितने? हर एक {price}।',
  'prompt.quantity': 'मात्रा',
  'prompt.carrying': 'आपके पास {amount} है।',
  'prompt.vaultHolds': 'तिजोरी में {amount} है।',
  'prompt.newPinHint': 'नए PIN के लिए आपके अकाउंट का पासवर्ड चाहिए।',
  'prompt.pin': 'PIN',
  'prompt.password': 'पासवर्ड',
  'prompt.wantsToTrade': 'खिलाड़ी {name} आपसे लेन-देन करना चाहता है।',
} satisfies Partial<Record<keyof typeof en, string>>;
