import type { QuestLayer } from './layer';
import { questDataLayer } from './questData';
import { killCountersLayer } from './killCounters';
import { legacyQuestsLayer } from './legacyQuests';
import { questLogLayer } from './questLog';
import { npcDialogueLayer } from './npcDialogue';
import { questBubblesLayer } from './questBubbles';

/**
 * THE list. Every quest entry in the game is one line here, and adding an
 * entry is adding one line. Nothing else in the codebase enumerates them.
 *
 * Order is update order: an entry that reads another comes after it.
 */
export const QUEST_LAYERS: readonly QuestLayer[] = [
  questDataLayer, // loads the tables everything below reads
  killCountersLayer, // reset only; fed by packets + kills
  legacyQuestsLayer, // reads questData + killCounters
  questLogLayer, // reads questData
  npcDialogueLayer, // reads questData + questLog (the NPC's quest list)
  questBubblesLayer, // reads legacyQuests
];
