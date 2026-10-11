/** Romanian text of the `quests` window. */

import type en from './en';

export default {
  'quest.tab.quest': 'Misiune',
  'quest.tab.jobChange': 'Clasă',
  'quest.tab.castleTemple': 'Castel/Templu',
  'quest.npc': 'NPC de misiuni',
  'quest.whichQuest': 'Ce misiune vrei să accepți?',
  'quest.complete': 'Finalizează',
  'quest.completed': 'Misiune finalizată',
  'quest.inProgress': 'Misiune în curs',
  'quest.notStarted': 'Misiune neîncepută',
  'quest.castleSiege': 'Castle Siege',
  'quest.noSiegeInfo': 'Nicio informație despre asediu',
  'quest.illusionTemple': 'Illusion Temple',
  'quest.noTempleInfo': 'Nicio informație despre templu',
  'quest.proceed': 'Continuă misiunea',
  'quest.giveUpConfirm': 'Dacă renunți, nu vei mai putea continua această misiune sau misiunile legate de ea. Sigur vrei să renunți?',
  'quest.waitingServer': 'Se așteaptă serverul...',
  'quest.npcFallback': 'NPC {type}',
  'quest.contribution': 'Contribuție: {value}',
  'quest.tracker.returnToNpc': 'Întoarce-te la NPC-ul misiunii',
} satisfies Partial<Record<keyof typeof en, string>>;
