/** hi text of `src/modules/guild`. */

import type en from './en';

export default {
  'guild.memberLeft': '{name} ने गिल्ड छोड़ दिया।',
  'guild.youLeft': 'आपने गिल्ड छोड़ दिया है।',
  'guild.disbanded': 'गिल्ड भंग कर दिया गया है।',
  'guild.memberRemoved': 'सदस्य को गिल्ड से निकाल दिया गया।',
  'guild.onlyMasterRemoves': 'सिर्फ़ गिल्ड मास्टर सदस्यों को निकाल सकता है।',
  'guild.wrongPassword': 'आपका डाला गया पासवर्ड गलत है।',
  'guild.created': 'गिल्ड बन गया है।',
  'guild.nameTaken': 'यह गिल्ड नाम पहले से लिया जा चुका है।',
  'guild.createFailed': 'गिल्ड नहीं बनाया जा सका।',
  'guild.joinRefused': 'गिल्ड मास्टर ने आपका अनुरोध ठुकरा दिया।',
  'guild.joined': 'आप गिल्ड में शामिल हो गए हैं।',
  'guild.isFull': 'गिल्ड भरा हुआ है।',
  'guild.masterUnavailable': 'गिल्ड मास्टर उपलब्ध नहीं है।',
  'guild.masterBusy': 'गिल्ड मास्टर व्यस्त है। बाद में फिर कोशिश करें।',
  'guild.needLevel6': 'गिल्ड में शामिल होने के लिए कम से कम लेवल 6 होना चाहिए।',
} satisfies Partial<Record<keyof typeof en, string>>;
