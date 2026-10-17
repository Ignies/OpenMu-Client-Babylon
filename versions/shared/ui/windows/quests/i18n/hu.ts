/** hu text of `versions/shared/ui/windows/quests`. */

import type en from './en';

export default {
  'quest.tab.quest': 'Küldetés',
  'quest.tab.jobChange': 'Kasztváltás',
  'quest.tab.castleTemple': 'Vár/Templom',
  'quest.npc': 'Küldetés NPC',
  'quest.whichQuest': 'Melyik küldetést vállalod?',
  'quest.complete': 'Teljesítés',
  'quest.completed': 'Küldetés teljesítve',
  'quest.inProgress': 'Küldetés folyamatban',
  'quest.notStarted': 'A küldetés még nem kezdődött el',
  'quest.castleSiege': 'Castle Siege',
  'quest.noSiegeInfo': 'Nincs ostrominformáció',
  'quest.illusionTemple': 'Illusion Temple',
  'quest.noTempleInfo': 'Nincs templominformáció',
  'quest.proceed': 'Küldetés folytatása',
  'quest.giveUpConfirm':
    'Ha feladod, sem ezt, sem a hozzá kapcsolódó küldetéseket nem folytathatod. Biztosan feladod?',
  'quest.waitingServer': 'Várakozás a szerverre...',
  'quest.npcFallback': 'NPC {type}',
  'quest.contribution': 'Hozzájárulás: {value}',
  'quest.tracker.returnToNpc': 'Térj vissza a küldetés NPC-jéhez',
} satisfies Partial<Record<keyof typeof en, string>>;
