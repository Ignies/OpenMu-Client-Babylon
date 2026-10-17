/** hi text of `versions/shared/ui`. */

import type en from './en';

export default {
  'servers.loading': 'सर्वर सूची लोड हो रही है...',
  'servers.serverName': 'सर्वर {number}',
  'login.id': 'ID',
  'login.password': 'पासवर्ड',
  'options.title': 'विकल्प',
  'options.texturePack': 'मॉडल टेक्सचर',
  'options.texturePack.original': 'मूल',
  'options.texturePackHint': 'ज़्यादा रिज़ॉल्यूशन वाले मॉडल टेक्सचर, बिना रीलोड किए लागू होते हैं',
  'session.toLevel': 'लेवल तक',
  'bottomBar.pet.normalTip': 'सामान्य: कौवा आपके साथ रहता है',
  'bottomBar.pet.randomTip': 'रैंडम: पास की किसी भी चीज़ पर हमला करता है',
  'bottomBar.pet.ownerTip': 'मालिक: आप जिस पर हमला करें, उस पर हमला करता है',
  'bottomBar.pet.targetTip': 'लक्ष्य: आपके मौजूदा लक्ष्य पर हमला करता है',
  'skills.title': 'स्किल',
  'skills.empty': 'कोई स्किल नहीं सीखी गई',
  'chatRoom.leave': 'छोड़ें',
  'command.trade': 'लेन-देन',
  'command.purchase': 'खरीदें',
  'command.party': 'पार्टी',
  'command.whisper': 'कानाफूसी',
  'command.follow': 'पीछे चलें',
  'command.battle': 'युद्ध',
  'warp.title': 'वार्प कमांड विंडो',
  'instrument.putAway': 'रख दें',
  'prompt.trade': 'लेन-देन',
} satisfies Partial<Record<keyof typeof en, string>>;
