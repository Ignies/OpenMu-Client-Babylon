/** hi text of `src/modules/_shared`. */

import type en from './en';

export default {
  'personalShop.needLevel': 'निजी दुकान के लिए किरदार का लेवल 6 चाहिए।',
  'personalShop.openFailed': 'दुकान खोली नहीं जा सकी।',
  'personalShop.cannotSell': 'यह आइटम दुकान में नहीं बेचा जा सकता।',
  'personalShop.itemGone': 'वह आइटम अब नहीं है।',
  'guild.alreadyInGuild': 'आप पहले से एक गिल्ड में हैं।',
  'guild.notGuildMaster': 'वह खिलाड़ी गिल्ड मास्टर नहीं है।',
  'guild.requestFailed': 'गिल्ड अनुरोध विफल रहा।',
  'quest.itemFallback': 'आइटम {id}',
  'event.shortOfZen': 'आपके पास Zen कम है।',
  'notify.negativePrice': 'कीमत शून्य से कम नहीं हो सकती',
} satisfies Partial<Record<keyof typeof en, string>>;
