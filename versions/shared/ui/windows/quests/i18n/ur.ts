/** ur text of `versions/shared/ui/windows/quests`. */

import type en from './en';

export default {
  'quest.tab.quest': 'مہم',
  'quest.tab.jobChange': 'کلاس کی تبدیلی',
  'quest.tab.castleTemple': 'قلعہ/معبد',
  'quest.npc': 'مہم NPC',
  'quest.whichQuest': 'آپ کون سی مہم لینا چاہیں گے؟',
  'quest.complete': 'مکمل کریں',
  'quest.completed': 'مہم مکمل',
  'quest.inProgress': 'مہم جاری ہے',
  'quest.notStarted': 'مہم شروع نہیں ہوئی',
  'quest.castleSiege': 'Castle Siege',
  'quest.noSiegeInfo': 'محاصرے کی کوئی معلومات نہیں',
  'quest.illusionTemple': 'Illusion Temple',
  'quest.noTempleInfo': 'معبد کی کوئی معلومات نہیں',
  'quest.proceed': 'مہم جاری رکھیں',
  'quest.giveUpConfirm':
    'اگر آپ چھوڑ دیں تو یہ یا اس سے جڑی کوئی بھی مہم جاری نہیں رکھ سکیں گے۔ کیا آپ واقعی چھوڑنا چاہتے ہیں؟',
  'quest.waitingServer': 'سرور کا انتظار...',
  'quest.npcFallback': 'NPC {type}',
  'quest.contribution': 'حصہ: {value}',
  'quest.tracker.returnToNpc': 'مہم NPC کے پاس واپس جائیں',
} satisfies Partial<Record<keyof typeof en, string>>;
