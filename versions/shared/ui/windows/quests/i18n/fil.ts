/** fil text of `versions/shared/ui/windows/quests`. */

import type en from './en';

export default {
  'quest.tab.quest': 'Quest',
  'quest.tab.jobChange': 'Pagpalit ng klase',
  'quest.tab.castleTemple': 'Kastilyo/Templo',
  'quest.npc': 'NPC ng quest',
  'quest.whichQuest': 'Aling quest ang gusto mong tanggapin?',
  'quest.complete': 'Tapusin',
  'quest.completed': 'Tapos na ang quest',
  'quest.inProgress': 'Kasalukuyang quest',
  'quest.notStarted': 'Hindi pa nasisimulan ang quest',
  'quest.castleSiege': 'Castle Siege',
  'quest.noSiegeInfo': 'Walang impormasyon sa siege',
  'quest.illusionTemple': 'Illusion Temple',
  'quest.noTempleInfo': 'Walang impormasyon sa templo',
  'quest.proceed': 'Ituloy ang quest',
  'quest.giveUpConfirm':
    'Kapag sumuko ka, hindi mo na maipagpapatuloy ito o anumang kaugnay na quest. Talaga bang susuko ka?',
  'quest.waitingServer': 'Hinihintay ang server...',
  'quest.npcFallback': 'NPC {type}',
  'quest.contribution': 'Ambag: {value}',
  'quest.tracker.returnToNpc': 'Bumalik sa NPC ng quest',
} satisfies Partial<Record<keyof typeof en, string>>;
