/** Russian text of the `quests` window. */

import type en from './en';

export default {
  'quest.tab.quest': 'Задание',
  'quest.tab.jobChange': 'Класс',
  'quest.tab.castleTemple': 'Замок/Храм',
  'quest.npc': 'NPC заданий',
  'quest.whichQuest': 'Какое задание вы хотите взять?',
  'quest.complete': 'Завершить',
  'quest.completed': 'Задание выполнено',
  'quest.inProgress': 'Задание выполняется',
  'quest.notStarted': 'Задание не начато',
  'quest.castleSiege': 'Castle Siege',
  'quest.noSiegeInfo': 'Нет сведений об осаде',
  'quest.illusionTemple': 'Illusion Temple',
  'quest.noTempleInfo': 'Нет сведений о храме',
  'quest.proceed': 'Продолжить задание',
  'quest.giveUpConfirm': 'Если вы откажетесь, то не сможете продолжить ни это задание, ни связанные с ним. Вы действительно хотите отказаться?',
  'quest.waitingServer': 'Ожидание сервера...',
  'quest.npcFallback': 'NPC {type}',
  'quest.contribution': 'Вклад: {value}',
  'quest.tracker.returnToNpc': 'Вернитесь к NPC задания',
} satisfies Partial<Record<keyof typeof en, string>>;
