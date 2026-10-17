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
  'party.reply.on': 'पार्टी न्योते: आपसे पूछा जाएगा।',
  'party.reply.off': 'पार्टी न्योते: अपने आप ठुकराए जाएंगे। फिर से पूछे जाने के लिए /re on।',
  'party.reply.auto': 'पार्टी न्योते: अपने आप स्वीकार होंगे। फिर से पूछे जाने के लिए /re on।',
  'party.reply.status': 'पार्टी न्योते: /re {mode}। /re on, /re off या /re auto इस्तेमाल करें।',
  'party.reply.declined': 'खिलाड़ी {name} का पार्टी न्योता ठुकराया गया (/re)।',
  'party.reply.accepted': 'खिलाड़ी {name} का पार्टी न्योता स्वीकार किया गया (/re)।',
  'stats.added': '{stat} में {amount} पॉइंट जोड़े गए।',
  'stats.name.str': 'शक्ति',
  'stats.name.agi': 'फुर्ती',
  'stats.name.vit': 'सहनशक्ति',
  'stats.name.ene': 'ऊर्जा',
  'stats.name.cmd': 'नेतृत्व',
} satisfies Partial<Record<keyof typeof en, string>>;
