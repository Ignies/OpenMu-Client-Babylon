/** hi text of `src/modules/personal_shop`. */

import type en from './en';

export default {
  'personalShop.disabled': 'इस सर्वर पर निजी दुकानें बंद हैं।',
  'personalShop.slotNotInShop': 'वह स्लॉट दुकान का हिस्सा नहीं है।',
  'personalShop.priceNotSet': 'कीमत तय नहीं की जा सकी।',
} satisfies Partial<Record<keyof typeof en, string>>;
