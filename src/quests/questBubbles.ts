/**
 * Quest state on the HUD: the exclamation / question emoji bubbles
 * (`common/emojiBubbles.ts`) over quest NPCs in scope, the clone's stand-in
 * for the original's lack of any marker.
 *
 * Driven by `legacyQuests.ts` (which NPC gives the hero's next quest, and
 * whether it is in progress) and by the entities in scope. Read by nobody:
 * it only *commands* `EmojiBubbleSystem` by attaching bubbles.
 *
 * - `exclaim`: the hero's next chain quest is not started, the hero may take
 *   it now, and this NPC gives it.
 * - `question`: the quest is in progress (bring the items back here).
 */
import type { ENUM_WORLD } from '../common/types';
import type { EmojiBubbleId } from '../common/emojiBubbles';
import { startEmojiBubble } from '../ecs/systems/emojiBubbleSystem';
import { Store } from '../store';
import type { QuestLayer } from './layer';
import { questDefinition } from './questData';
import {
  LegacyQuestState,
  legacyQuestAvailable,
  legacyQuestListReceived,
  legacyQuestNextIndex,
  legacyQuestState,
} from './legacyQuests';

// ---- 1. tuning -------------------------------------------------------------

/**
 * Seconds between two bubble refreshes. The `exclaim` / `question` bubbles
 * live 4 s (`EMOJI_BUBBLES`), so re-arming every 3 s keeps one permanently
 * up without stacking pop-ins.
 */
const REFRESH_SECONDS = 3;

// ---- 2. state + readers ----------------------------------------------------

let sinceRefresh = REFRESH_SECONDS;

/** The bubble a quest NPC of this type should carry right now, if any. */
export function questBubbleFor(npcType: number): EmojiBubbleId | null {
  if (!legacyQuestListReceived()) return null;

  const index = legacyQuestNextIndex();
  const quest = questDefinition(index);
  if (!quest?.name || quest.npcType !== npcType) return null;

  // OpenMU sends a quest not taken yet as `QUEST_NO` (3), not 0.
  const state = legacyQuestState(index);
  if (state === LegacyQuestState.InProgress) return 'question';
  if ((state === LegacyQuestState.None || state === LegacyQuestState.No) && legacyQuestAvailable(index)) {
    return 'exclaim';
  }
  return null;
}

function update(_map: ENUM_WORLD, dt: number): void {
  sinceRefresh += dt;
  if (sinceRefresh < REFRESH_SECONDS) return;
  sinceRefresh = 0;

  const world = Store.world;
  if (!world) return;

  for (const entity of world.netObjsQuery) {
    const type = entity.npcType;
    if (type === undefined || entity.localPlayer || entity.objOutOfScope) continue;
    const bubble = questBubbleFor(type);
    if (bubble) startEmojiBubble(world, entity, bubble);
  }
}

function reset(): void {
  sinceRefresh = REFRESH_SECONDS;
}

// ---- 3. the layer ----------------------------------------------------------

export const questBubblesLayer: QuestLayer = { name: 'questBubbles', update, reset };
