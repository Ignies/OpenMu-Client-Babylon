/** sr-Latn text of `versions/shared/ui/windows/quests`. */

import type en from './en';

export default {
  'quest.tab.quest': 'Zadatak',
  'quest.tab.jobChange': 'Promena klase',
  'quest.tab.castleTemple': 'Zamak/Hram',
  'quest.npc': 'NPC zadatka',
  'quest.whichQuest': 'Koji zadatak želiš da prihvatiš?',
  'quest.complete': 'Završi',
  'quest.completed': 'Zadatak je završen',
  'quest.inProgress': 'Zadatak je u toku',
  'quest.notStarted': 'Zadatak nije započet',
  'quest.castleSiege': 'Castle Siege',
  'quest.noSiegeInfo': 'Nema podataka o opsadi',
  'quest.illusionTemple': 'Illusion Temple',
  'quest.noTempleInfo': 'Nema podataka o hramu',
  'quest.proceed': 'Nastavi zadatak',
  'quest.giveUpConfirm':
    'Ako odustaneš, nećeš moći da nastaviš ni ovaj ni bilo koji povezani zadatak. Da li zaista želiš da odustaneš?',
  'quest.waitingServer': 'Čekanje servera...',
  'quest.npcFallback': 'NPC {type}',
  'quest.contribution': 'Doprinos: {value}',
  'quest.tracker.returnToNpc': 'Vrati se kod NPC lika zadatka',
} satisfies Partial<Record<keyof typeof en, string>>;
