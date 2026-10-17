/** cs text of `versions/shared/ui/windows/quests`. */

import type en from './en';

export default {
  'quest.tab.quest': 'Úkol',
  'quest.tab.jobChange': 'Změna povolání',
  'quest.tab.castleTemple': 'Hrad/Chrám',
  'quest.npc': 'NPC úkolu',
  'quest.whichQuest': 'Který úkol chceš přijmout?',
  'quest.complete': 'Dokončit',
  'quest.completed': 'Úkol splněn',
  'quest.inProgress': 'Úkol probíhá',
  'quest.notStarted': 'Úkol nezahájen',
  'quest.castleSiege': 'Castle Siege',
  'quest.noSiegeInfo': 'Žádné informace o obléhání',
  'quest.illusionTemple': 'Illusion Temple',
  'quest.noTempleInfo': 'Žádné informace o chrámu',
  'quest.proceed': 'Pokračovat v úkolu',
  'quest.giveUpConfirm':
    'Pokud to vzdáš, nebudeš moci pokračovat v tomto ani v žádném souvisejícím úkolu. Opravdu to chceš vzdát?',
  'quest.waitingServer': 'Čekání na server...',
  'quest.npcFallback': 'NPC {type}',
  'quest.contribution': 'Příspěvek: {value}',
  'quest.tracker.returnToNpc': 'Vrať se k NPC úkolu',
} satisfies Partial<Record<keyof typeof en, string>>;
