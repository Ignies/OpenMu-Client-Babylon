/** Japanese text of the `quests` window. */

import type en from './en';

export default {
  'quest.tab.quest': 'クエスト',
  'quest.tab.jobChange': '転職',
  'quest.tab.castleTemple': '城／神殿',
  'quest.npc': 'クエスト NPC',
  'quest.whichQuest': 'どのクエストを受けますか？',
  'quest.complete': '完了',
  'quest.completed': 'クエスト完了',
  'quest.inProgress': 'クエスト進行中',
  'quest.notStarted': 'クエスト未開始',
  'quest.castleSiege': '攻城戦',
  'quest.noSiegeInfo': '攻城戦の情報はありません',
  'quest.illusionTemple': 'イリュージョンテンプル',
  'quest.noTempleInfo': '神殿の情報はありません',
  'quest.proceed': 'クエストを進める',
  'quest.giveUpConfirm': 'クエストを破棄すると該当クエスト及び関連した全ての連係クエストが進行できなくなります。本当に破棄しますか？',
  'quest.waitingServer': 'サーバーを待っています...',
  'quest.npcFallback': 'NPC {type}',
  'quest.contribution': '貢献度: {value}',
  'quest.tracker.returnToNpc': 'クエストNPCのところへ戻りましょう',
} satisfies Partial<Record<keyof typeof en, string>>;
