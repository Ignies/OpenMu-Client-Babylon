/** fa text of `versions/shared/ui/windows/quests`. */

import type en from './en';

export default {
  'quest.tab.quest': 'مأموریت',
  'quest.tab.jobChange': 'تغییر کلاس',
  'quest.tab.castleTemple': 'قلعه/معبد',
  'quest.npc': 'مأموریت‌دهنده',
  'quest.whichQuest': 'کدام مأموریت را می‌پذیرید؟',
  'quest.complete': 'تکمیل',
  'quest.completed': 'مأموریت تکمیل شد',
  'quest.inProgress': 'مأموریت در جریان است',
  'quest.notStarted': 'مأموریت آغاز نشده',
  'quest.castleSiege': 'Castle Siege',
  'quest.noSiegeInfo': 'اطلاعاتی از محاصره نیست',
  'quest.illusionTemple': 'Illusion Temple',
  'quest.noTempleInfo': 'اطلاعاتی از معبد نیست',
  'quest.proceed': 'ادامه مأموریت',
  'quest.giveUpConfirm':
    'اگر کنار بکشید، دیگر نمی‌توانید این مأموریت یا مأموریت‌های وابسته به آن را ادامه دهید. آیا واقعاً می‌خواهید کنار بکشید؟',
  'quest.waitingServer': 'در انتظار سرور...',
  'quest.npcFallback': 'شخصیت NPC {type}',
  'quest.contribution': 'مشارکت: {value}',
  'quest.tracker.returnToNpc': 'نزد مأموریت‌دهنده بازگردید',
} satisfies Partial<Record<keyof typeof en, string>>;
