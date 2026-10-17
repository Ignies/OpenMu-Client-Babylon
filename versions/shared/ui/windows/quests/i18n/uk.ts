/** uk text of `versions/shared/ui/windows/quests`. */

import type en from './en';

export default {
  'quest.tab.quest': 'Завдання',
  'quest.tab.jobChange': 'Зміна класу',
  'quest.tab.castleTemple': 'Замок/Храм',
  'quest.npc': 'NPC завдань',
  'quest.whichQuest': 'Яке завдання ви хочете взяти?',
  'quest.complete': 'Завершити',
  'quest.completed': 'Завдання виконано',
  'quest.inProgress': 'Завдання виконується',
  'quest.notStarted': 'Завдання не розпочато',
  'quest.castleSiege': 'Castle Siege',
  'quest.noSiegeInfo': 'Немає відомостей про облогу',
  'quest.illusionTemple': 'Illusion Temple',
  'quest.noTempleInfo': 'Немає відомостей про храм',
  'quest.proceed': 'Продовжити завдання',
  'quest.giveUpConfirm':
    'Якщо ви відмовитеся, то не зможете продовжити ні це, ні пов’язані з ним завдання. Ви справді хочете відмовитися?',
  'quest.waitingServer': 'Очікування сервера...',
  'quest.npcFallback': 'NPC {type}',
  'quest.contribution': 'Внесок: {value}',
  'quest.tracker.returnToNpc': 'Поверніться до NPC завдання',
} satisfies Partial<Record<keyof typeof en, string>>;
