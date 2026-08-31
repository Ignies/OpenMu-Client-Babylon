import type { ENUM_WORLD } from '../common/types';
import type { NpcWindowResponseNpcWindowEnum } from '../common/packets/ServerToClientPackets';
import type { QuestLayer } from './layer';
import { QUEST_LAYERS } from './layers';
import { loadQuestData, npcDialogueEntry, questDataReady } from './questData';
import {
  closeLegacyQuestWindow,
  legacyQuestForNpc,
  legacyQuestState,
  legacyQuestWindowOpen,
  openLegacyQuestWindow,
  requestLegacyQuestStates,
} from './legacyQuests';
import {
  activeQuests,
  eventQuestListReceived,
  closeQuestList,
  closeQuestProgress,
  myQuestWindowOpen,
  questListOpen,
  questProgressOpen,
  requestActiveQuests,
  showMyQuestWindow,
} from './questLog';
import { answerNpcDialogue, closeNpcDialogue, npcDialogueOpen, openNpcDialogue } from './npcDialogue';
import { questBubbleFor } from './questBubbles';
import { legacyKillCount } from './killCounters';
import { Store } from '../store';

export type { QuestLayer } from './layer';

/**
 * The quest system: the legacy Scroll-of-Emperor chain, the Season 6 quest
 * log, the kill counters and the HUD bubbles, behind one object. Copy `_template.ts` when adding to it.
 *
 * The game talks to `quests.update` once a frame (`QuestSystem`) and
 * `quests.reset` on a map change (`loadMapIntoScene`); both fan out over
 * `QUEST_LAYERS` (`layers.ts`), the only list of entries in the codebase.
 * The readers and commands below are the facade's public surface for
 * consumers that want the whole system from one import (`logic.ts`, the
 * bottom bar); every entry file stays importable directly for the windows.
 */
class Quests {
  private readonly layers: QuestLayer[] = [...QUEST_LAYERS];

  /** Add an entry at runtime (tools, experiments). Returns the unregister. */
  register(layer: QuestLayer): () => void {
    this.layers.push(layer);
    return () => {
      const i = this.layers.indexOf(layer);
      if (i >= 0) this.layers.splice(i, 1);
    };
  }

  /** Every entry that exists on this map. */
  layersFor(map: ENUM_WORLD): QuestLayer[] {
    return this.layers.filter(l => !l.maps || l.maps.has(map));
  }

  /** Step every entry. Call once a frame, before anything reads the quests. */
  update(map: ENUM_WORLD, dt: number): void {
    for (const layer of this.layers) layer.update?.(map, dt);
  }

  /** Close the NPC windows and drop per-map state. Call when the map changes. */
  reset(): void {
    for (const layer of this.layers) layer.reset?.();
  }

  // ---- readers -----------------------------------------------------------

  /** Whether the quest tables are decoded. */
  get ready(): boolean {
    return questDataReady();
  }

  /** Whether any quest window (NPC dialog, list, progress, log) is up. */
  get anyWindowOpen(): boolean {
    return (
      legacyQuestWindowOpen() || npcDialogueOpen() || questListOpen() || questProgressOpen() || myQuestWindowOpen()
    );
  }

  /** Whether the Season 6 NPC dialogue (`CNewUINPCDialogue`) is up. */
  get npcDialogueOpen(): boolean {
    return npcDialogueOpen();
  }

  /** Whether the quest log window is up. */
  get logOpen(): boolean {
    return myQuestWindowOpen();
  }

  /** Running Season 6 quests, by `(number << 16) | group`. */
  get active(): readonly number[] {
    return activeQuests();
  }

  /** Whether the event quest list (`QuestEventResponse`) has arrived. */
  get eventListReceived(): boolean {
    return eventQuestListReceived();
  }

  /** `getQuestState2`: 0 none, 1 in progress, 2 finished. */
  legacyState(index: number): number {
    return legacyQuestState(index);
  }

  /** Kills of a monster type counted toward the legacy quest. */
  killCount(monsterType: number): number {
    return legacyKillCount(monsterType);
  }

  /** The emoji bubble a quest NPC should carry, if any. */
  bubbleFor(npcType: number): 'exclaim' | 'question' | null {
    return questBubbleFor(npcType) as 'exclaim' | 'question' | null;
  }

  // ---- commands ----------------------------------------------------------

  /** Start the table download (also happens on the first frame). */
  load(): void {
    loadQuestData();
  }

  /**
   * `NpcWindowResponse` fell through every merchant / vault / mix case:
   * if the NPC the hero is talking to hands out a legacy quest, open its
   * dialog client-side (`ShowQuestNpcWindow`) instead of "nothing for you".
   * Returns true when a quest window took the talk over.
   */
  openNpcWindow(_window: NpcWindowResponseNpcWindowEnum, npcType: number): boolean {
    const quest = legacyQuestForNpc(npcType);
    if (!quest) return false;
    Store.dropNpcTalk();
    openLegacyQuestWindow(quest.index);
    return true;
  }

  /**
   * `OpenNpcDialog` (F9 01, `ReceiveNPCDlgUIStart`): the server opened the
   * Season 6 NPC dialogue for `npcNumber` (OpenMU sends it for NPCs whose
   * window is `NpcDialog` — the buff NPCs, quest givers, Gens stewards).
   * Opens `npcDialogue.ts`'s window on page 0 of `NPCDialogue.bmd`; a NPC
   * without a page but with a legacy quest gets the legacy dialog instead.
   * `contribution` is the Gens contribution the packet carries.
   */
  openNpcDialog(npcNumber: number, contribution = 0): boolean {
    const quest = legacyQuestForNpc(npcNumber);
    Store.dropNpcTalk();
    if (quest && !npcDialogueEntry(npcNumber, 0)) {
      openLegacyQuestWindow(quest.index);
      return true;
    }
    openNpcDialogue(npcNumber, contribution);
    return true;
  }

  /** `ProcessSelTextResult`: pick answer `index` of the open NPC dialogue. */
  answerNpcDialog(index: number): void {
    answerNpcDialogue(index);
  }

  /** Toggle the quest log (the original's T key). */
  toggleLog(): void {
    showMyQuestWindow(!myQuestWindowOpen());
  }

  /** Close every quest window (Escape, warp, death). */
  closeAll(): void {
    closeLegacyQuestWindow();
    closeNpcDialogue();
    closeQuestList();
    closeQuestProgress();
    showMyQuestWindow(false);
  }

  /** Ask the server for every quest state again (legacy 0xA0 + S6 F6 1A). */
  refresh(): void {
    requestLegacyQuestStates();
    requestActiveQuests();
  }
}

export const quests = new Quests();

// A hot update that reaches this module must reload the page: Vite would
// otherwise re-execute it and hand later-loaded importers a second instance
// of this singleton (same guard as store.ts).
const hot = (import.meta as { hot?: { decline(): void } }).hot;
if (hot) hot.decline();
