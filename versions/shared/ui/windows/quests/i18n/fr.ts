/** French text of the `quests` window. */

import type en from './en';

export default {
  'quest.tab.quest': 'Quête',
  'quest.tab.jobChange': 'Classe',
  'quest.tab.castleTemple': 'Château/Temple',
  'quest.npc': 'PNJ de quête',
  'quest.whichQuest': 'Quelle quête voulez-vous accepter ?',
  'quest.complete': 'Terminer',
  'quest.completed': 'Quête terminée',
  'quest.inProgress': 'Quête en cours',
  'quest.notStarted': 'Quête non commencée',
  'quest.castleSiege': 'Castle Siege',
  'quest.noSiegeInfo': 'Aucune information sur le siège',
  'quest.illusionTemple': 'Illusion Temple',
  'quest.noTempleInfo': 'Aucune information sur le temple',
  'quest.proceed': 'Poursuivre la quête',
  'quest.giveUpConfirm': 'Si vous abandonnez, vous ne pourrez plus poursuivre cette quête ni les quêtes liées. Voulez-vous vraiment abandonner ?',
  'quest.waitingServer': 'En attente du serveur...',
  'quest.npcFallback': 'PNJ {type}',
  'quest.contribution': 'Contribution : {value}',
  'quest.tracker.returnToNpc': 'Retournez voir le PNJ de la quête',
} satisfies Partial<Record<keyof typeof en, string>>;
