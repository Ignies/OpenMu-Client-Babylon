/** hi text of `src/modules/social`. */

import type en from './en';

export default {
  'party.left': 'आपने पार्टी छोड़ दी है।',
  'party.onlyLeaderInvites': 'सिर्फ़ पार्टी लीडर न्योता दे सकता है।',
  'party.full': 'पार्टी भरी हुई है।',
  'party.invitationSent': 'खिलाड़ी {name} को पार्टी का न्योता भेजा गया।',
  'guild.joinRequestSent': 'खिलाड़ी {name} को गिल्ड में शामिल होने का अनुरोध भेजा गया।',
  'guild.onlyMasterAppoints': 'सिर्फ़ गिल्ड मास्टर सदस्यों को नियुक्त कर सकता है।',
  'guild.onlyMasterCan': 'यह सिर्फ़ गिल्ड मास्टर कर सकता है।',
  'guild.allianceRequestSent': 'खिलाड़ी {name} को गठबंधन का अनुरोध भेजा गया।',
  'guild.hostilityRequestSent': 'खिलाड़ी {name} को शत्रुता का अनुरोध भेजा गया।',
} satisfies Partial<Record<keyof typeof en, string>>;
