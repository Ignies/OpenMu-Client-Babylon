/** Korean text of the `quests` window. */

import type en from './en';

export default {
  'quest.tab.quest': '퀘스트',
  'quest.tab.jobChange': '전직',
  'quest.tab.castleTemple': '성/신전',
  'quest.npc': '퀘스트 NPC',
  'quest.whichQuest': '어떤 퀘스트를 받으시겠습니까?',
  'quest.complete': '완료',
  'quest.completed': '퀘스트 완료',
  'quest.inProgress': '퀘스트 진행 중',
  'quest.notStarted': '퀘스트 미시작',
  'quest.castleSiege': '성 공성전',
  'quest.noSiegeInfo': '공성전 정보가 없습니다',
  'quest.illusionTemple': '일루전 템플',
  'quest.noTempleInfo': '신전 정보가 없습니다',
  'quest.proceed': '퀘스트 진행',
  'quest.giveUpConfirm': '포기하면 이 퀘스트와 연계된 모든 퀘스트를 더 이상 진행할 수 없습니다. 정말 포기하시겠습니까?',
  'quest.waitingServer': '서버를 기다리는 중...',
  'quest.npcFallback': 'NPC {type}',
  'quest.contribution': '기여도: {value}',
  'quest.tracker.returnToNpc': '퀘스트 NPC에게 돌아가세요',
} satisfies Partial<Record<keyof typeof en, string>>;
