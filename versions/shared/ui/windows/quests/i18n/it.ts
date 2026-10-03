/** Italian text of the `quests` window. */

import type en from './en';

export default {
  'quest.tab.quest': 'Missione',
  'quest.tab.jobChange': 'Classe',
  'quest.tab.castleTemple': 'Castello/Tempio',
  'quest.npc': 'PNG delle missioni',
  'quest.whichQuest': 'Quale missione vuoi accettare?',
  'quest.complete': 'Completa',
  'quest.completed': 'Missione completata',
  'quest.inProgress': 'Missione in corso',
  'quest.notStarted': 'Missione non iniziata',
  'quest.castleSiege': 'Castle Siege',
  'quest.noSiegeInfo': 'Nessuna informazione sull’assedio',
  'quest.illusionTemple': 'Illusion Temple',
  'quest.noTempleInfo': 'Nessuna informazione sul tempio',
  'quest.proceed': 'Prosegui la missione',
  'quest.giveUpConfirm': 'Se rinunci, non potrai proseguire questa missione né quelle collegate. Vuoi davvero rinunciare?',
  'quest.waitingServer': 'In attesa del server...',
  'quest.npcFallback': 'NPC {type}',
  'quest.contribution': 'Contributo: {value}',
  'quest.tracker.returnToNpc': 'Torna dall’NPC della missione',
} satisfies Partial<Record<keyof typeof en, string>>;
