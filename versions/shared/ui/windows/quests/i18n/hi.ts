/** hi text of `versions/shared/ui/windows/quests`. */

import type en from './en';

export default {
  'quest.tab.quest': 'क्वेस्ट',
  'quest.tab.jobChange': 'वर्ग परिवर्तन',
  'quest.tab.castleTemple': 'किला/मंदिर',
  'quest.npc': 'क्वेस्ट NPC',
  'quest.whichQuest': 'आप कौन सा क्वेस्ट लेना चाहेंगे?',
  'quest.complete': 'पूरा करें',
  'quest.completed': 'क्वेस्ट पूर्ण',
  'quest.inProgress': 'क्वेस्ट जारी है',
  'quest.notStarted': 'क्वेस्ट शुरू नहीं हुआ',
  'quest.castleSiege': 'Castle Siege',
  'quest.noSiegeInfo': 'घेराबंदी की कोई जानकारी नहीं',
  'quest.illusionTemple': 'Illusion Temple',
  'quest.noTempleInfo': 'मंदिर की कोई जानकारी नहीं',
  'quest.proceed': 'क्वेस्ट जारी रखें',
  'quest.giveUpConfirm':
    'अगर आप इसे छोड़ देते हैं, तो आप यह या इससे जुड़ा कोई भी क्वेस्ट आगे नहीं कर पाएंगे। क्या आप सच में छोड़ना चाहते हैं?',
  'quest.waitingServer': 'सर्वर का इंतज़ार...',
  'quest.npcFallback': 'NPC {type}',
  'quest.contribution': 'योगदान: {value}',
  'quest.tracker.returnToNpc': 'क्वेस्ट NPC के पास लौटें',
} satisfies Partial<Record<keyof typeof en, string>>;
