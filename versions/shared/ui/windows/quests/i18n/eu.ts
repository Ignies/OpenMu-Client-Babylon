/** eu text of `versions/shared/ui/windows/quests`. */

import type en from './en';

export default {
  'quest.tab.quest': 'Misioa',
  'quest.tab.jobChange': 'Klase-aldaketa',
  'quest.tab.castleTemple': 'Gaztelua/Tenplua',
  'quest.npc': 'Misio-NPCa',
  'quest.whichQuest': 'Zein misio hartu nahi duzu?',
  'quest.complete': 'Osatu',
  'quest.completed': 'Misioa osatuta',
  'quest.inProgress': 'Misioa abian',
  'quest.notStarted': 'Misioa hasi gabe',
  'quest.castleSiege': 'Castle Siege',
  'quest.noSiegeInfo': 'Ez dago setioari buruzko informaziorik',
  'quest.illusionTemple': 'Illusion Temple',
  'quest.noTempleInfo': 'Ez dago tenpluari buruzko informaziorik',
  'quest.proceed': 'Jarraitu misioarekin',
  'quest.giveUpConfirm':
    'Amore ematen baduzu, ezingo duzu misio honekin edo harekin lotutako beste misioekin jarraitu. Benetan amore eman nahi duzu?',
  'quest.waitingServer': 'Zerbitzariaren zain...',
  'quest.npcFallback': 'NPC {type}',
  'quest.contribution': 'Ekarpena: {value}',
  'quest.tracker.returnToNpc': 'Itzuli misio-NPCarengana',
} satisfies Partial<Record<keyof typeof en, string>>;
