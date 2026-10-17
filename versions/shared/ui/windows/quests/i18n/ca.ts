/** ca text of `versions/shared/ui/windows/quests`. */

import type en from './en';

export default {
  'quest.tab.quest': 'Missió',
  'quest.tab.jobChange': 'Canvi de classe',
  'quest.tab.castleTemple': 'Castell/Temple',
  'quest.npc': 'PNJ de missions',
  'quest.whichQuest': 'Quina missió vols acceptar?',
  'quest.complete': 'Completa',
  'quest.completed': 'Missió completada',
  'quest.inProgress': 'Missió en curs',
  'quest.notStarted': 'Missió no començada',
  'quest.castleSiege': 'Castle Siege',
  'quest.noSiegeInfo': 'No hi ha informació del setge',
  'quest.illusionTemple': 'Illusion Temple',
  'quest.noTempleInfo': 'No hi ha informació del temple',
  'quest.proceed': 'Continua la missió',
  'quest.giveUpConfirm':
    'Si hi renuncies, no podràs continuar ni aquesta missió ni cap de relacionada. Segur que hi vols renunciar?',
  'quest.waitingServer': 'S\'està esperant el servidor...',
  'quest.npcFallback': 'PNJ {type}',
  'quest.contribution': 'Contribució: {value}',
  'quest.tracker.returnToNpc': 'Torna al PNJ de la missió',
} satisfies Partial<Record<keyof typeof en, string>>;
