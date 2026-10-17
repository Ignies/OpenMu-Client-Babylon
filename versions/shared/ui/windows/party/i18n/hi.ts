/** hi text of `versions/shared/ui/windows/party`. */

import type en from './en';

export default {
  'party.title': 'पार्टी',
  'party.leader': 'पार्टी लीडर',
  'party.leave': 'पार्टी छोड़ें',
  'party.kick': '{name} को निकालें',
  'party.nearby': 'पास के खिलाड़ी',
  'party.nearbyEmpty': 'न्योता देने के लिए किसी खिलाड़ी के पास खड़े हों।',
  'party.tradeWith': '{name} से लेन-देन',
  'party.notInParty': 'आप किसी पार्टी में नहीं हैं।',
  'party.invite': 'न्योता दें',
  'party.shop': 'दुकान',
} satisfies Partial<Record<keyof typeof en, string>>;
