/** ar text of `versions/shared/ui/windows/quests`. */

import type en from './en';

export default {
  'quest.tab.quest': 'المهمة',
  'quest.tab.jobChange': 'تغيير الفئة',
  'quest.tab.castleTemple': 'القلعة/المعبد',
  'quest.npc': 'NPC المهام',
  'quest.whichQuest': 'أي مهمة تود أن تأخذ؟',
  'quest.complete': 'إكمال',
  'quest.completed': 'اكتملت المهمة',
  'quest.inProgress': 'المهمة قيد التنفيذ',
  'quest.notStarted': 'لم تبدأ المهمة',
  'quest.castleSiege': 'Castle Siege',
  'quest.noSiegeInfo': 'لا توجد معلومات عن الحصار',
  'quest.illusionTemple': 'Illusion Temple',
  'quest.noTempleInfo': 'لا توجد معلومات عن المعبد',
  'quest.proceed': 'متابعة المهمة',
  'quest.giveUpConfirm':
    'إذا تخليت عنها، فلن تتمكن من متابعة هذه المهمة أو أي مهمة مرتبطة بها. هل تريد التخلي عنها حقا؟',
  'quest.waitingServer': 'في انتظار الخادم...',
  'quest.npcFallback': 'NPC {type}',
  'quest.contribution': 'المساهمة: {value}',
  'quest.tracker.returnToNpc': 'عد إلى NPC المهمة',
} satisfies Partial<Record<keyof typeof en, string>>;
