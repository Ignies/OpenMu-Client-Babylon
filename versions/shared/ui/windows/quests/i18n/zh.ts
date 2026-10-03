/** Chinese text of the `quests` window. */

import type en from './en';

export default {
  'quest.tab.quest': '任务',
  'quest.tab.jobChange': '转职',
  'quest.tab.castleTemple': '城堡/神殿',
  'quest.npc': '任务 NPC',
  'quest.whichQuest': '你想接受哪个任务？',
  'quest.complete': '完成',
  'quest.completed': '任务已完成',
  'quest.inProgress': '任务进行中',
  'quest.notStarted': '任务尚未开始',
  'quest.castleSiege': '攻城战',
  'quest.noSiegeInfo': '没有攻城战信息',
  'quest.illusionTemple': '幻影神殿',
  'quest.noTempleInfo': '没有神殿信息',
  'quest.proceed': '继续任务',
  'quest.giveUpConfirm': '如果放弃，你将无法继续此任务及所有相关任务。确定要放弃吗？',
  'quest.waitingServer': '正在等待服务器...',
  'quest.npcFallback': 'NPC {type}',
  'quest.contribution': '贡献度：{value}',
  'quest.tracker.returnToNpc': '返回任务NPC处',
} satisfies Partial<Record<keyof typeof en, string>>;
