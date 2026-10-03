/** Bulgarian text of the `quests` window. */

import type en from './en';

export default {
  'quest.tab.quest': 'Мисия',
  'quest.tab.jobChange': 'Клас',
  'quest.tab.castleTemple': 'Замък/Храм',
  'quest.npc': 'NPC за мисии',
  'quest.whichQuest': 'Коя мисия искаш да поемеш?',
  'quest.complete': 'Завърши',
  'quest.completed': 'Мисията е завършена',
  'quest.inProgress': 'Мисията е в ход',
  'quest.notStarted': 'Мисията не е започната',
  'quest.castleSiege': 'Castle Siege',
  'quest.noSiegeInfo': 'Няма данни за обсадата',
  'quest.illusionTemple': 'Illusion Temple',
  'quest.noTempleInfo': 'Няма данни за храма',
  'quest.proceed': 'Продължи мисията',
  'quest.giveUpConfirm': 'Ако се откажеш, няма да можеш да продължиш тази или свързаните с нея мисии. Наистина ли искаш да се откажеш?',
  'quest.waitingServer': 'Изчакване на сървъра...',
  'quest.npcFallback': 'NPC {type}',
  'quest.contribution': 'Принос: {value}',
  'quest.tracker.returnToNpc': 'Върни се при NPC-то на задачата',
} satisfies Partial<Record<keyof typeof en, string>>;
