/** Polish text of the `quests` window. */

import type en from './en';

export default {
  'quest.tab.quest': 'Zadanie',
  'quest.tab.jobChange': 'Zmiana klasy',
  'quest.tab.castleTemple': 'Zamek/Świątynia',
  'quest.npc': 'NPC zadania',
  'quest.whichQuest': 'Które zadanie chcesz przyjąć?',
  'quest.complete': 'Zakończ',
  'quest.completed': 'Zadanie ukończone',
  'quest.inProgress': 'Zadanie w toku',
  'quest.notStarted': 'Zadanie nierozpoczęte',
  'quest.castleSiege': 'Castle Siege',
  'quest.noSiegeInfo': 'Brak informacji o oblężeniu',
  'quest.illusionTemple': 'Illusion Temple',
  'quest.noTempleInfo': 'Brak informacji o świątyni',
  'quest.proceed': 'Kontynuuj zadanie',
  'quest.giveUpConfirm':
    'Jeśli zrezygnujesz, nie będzie można kontynuować tego ani żadnego powiązanego zadania. Czy na pewno chcesz zrezygnować?',
  'quest.waitingServer': 'Oczekiwanie na serwer...',
  'quest.npcFallback': 'NPC {type}',
  'quest.contribution': 'Wkład: {value}',
  'quest.tracker.returnToNpc': 'Wróć do NPC zadania',
} satisfies Partial<Record<keyof typeof en, string>>;
