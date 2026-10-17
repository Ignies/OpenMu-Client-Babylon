/** zh-Hant text of `versions/shared/ui/windows/quests`. */

import type en from './en';

export default {
  'quest.tab.quest': '任務',
  'quest.tab.jobChange': '轉職',
  'quest.tab.castleTemple': '城堡／寺院',
  'quest.npc': '任務 NPC',
  'quest.whichQuest': '你想接受哪個任務？',
  'quest.complete': '完成',
  'quest.completed': '任務已完成',
  'quest.inProgress': '任務進行中',
  'quest.notStarted': '任務尚未開始',
  'quest.castleSiege': '攻城戰',
  'quest.noSiegeInfo': '沒有攻城戰資訊',
  'quest.illusionTemple': '幻影寺院',
  'quest.noTempleInfo': '沒有寺院資訊',
  'quest.proceed': '繼續任務',
  'quest.giveUpConfirm': '如果放棄，你將無法繼續此任務及所有相關任務。確定要放棄嗎？',
  'quest.waitingServer': '正在等待伺服器……',
  'quest.npcFallback': 'NPC{type}',
  'quest.contribution': '貢獻度：{value}',
  'quest.tracker.returnToNpc': '返回任務 NPC 處',
} satisfies Partial<Record<keyof typeof en, string>>;
