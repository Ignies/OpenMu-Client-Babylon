import type { ENUM_WORLD } from '../common/types';
import { Store } from '../store';
import { CloseNpcRequestPacket } from '../common/packets/ClientToServerPackets';
import type { Item } from '../ecs/world';
import type { EventEntryState, EventLayer } from './layer';
import { EVENT_LAYERS } from './layers';
import {
  bloodCastleWindow,
  closeBloodCastle,
  enterBloodCastle,
  openBloodCastle,
} from './bloodCastle';
import {
  closeDevilSquare,
  devilSquareWindow,
  enterDevilSquare,
  openDevilSquare,
} from './devilSquare';
import { closeChaosCastlePrompt, enterChaosCastle } from './chaosCastle';
import { matchCountdownLine } from './matchNotices';

export type { EventLayer, EventEntryState } from './layer';

/**
 * The events layer: Blood Castle, Devil Square, Chaos Castle and the lines
 * they share, behind one object. Copy `_template.ts` when adding to it.
 *
 * The game talks to `events.update` once a frame (`ecs/systems/eventSystem.ts`)
 * and `events.reset` on a map change (`libs/mu/loadMapIntoScene.ts`); both
 * fan out over `EVENT_LAYERS` (`layers.ts`), the only list of events in the
 * codebase. The commands below are what `logic.ts` (NPC windows) and the
 * inventory (tickets) call; the HUD reads the entry files directly.
 */
class Events {
  private readonly layers: EventLayer[] = [...EVENT_LAYERS];

  /** Add an event at runtime (tools, experiments). Returns the unregister. */
  register(layer: EventLayer): () => void {
    this.layers.push(layer);
    return () => {
      const i = this.layers.indexOf(layer);
      if (i >= 0) this.layers.splice(i, 1);
    };
  }

  /** Every event that exists on this map. */
  layersFor(map: ENUM_WORLD): EventLayer[] {
    return this.layers.filter(l => !l.maps || l.maps.has(map));
  }

  /** Step every layer. Call once a frame, before anything reads the events. */
  update(map: ENUM_WORLD, dt: number): void {
    for (const layer of this.layers) layer.update?.(map, dt);
  }

  /** Drop every layer's state. Call when the map changes. */
  reset(): void {
    for (const layer of this.layers) layer.reset?.();
  }

  // ---- readers -----------------------------------------------------------

  /** Every entry's snapshot, by name. */
  state(): Record<string, EventEntryState> {
    const out: Record<string, EventEntryState> = {};
    for (const layer of this.layers) out[layer.name] = layer.state();
    return out;
  }

  /** Any entry window or prompt is on screen (hot keys, inventory routing). */
  get anyOpen(): boolean {
    return this.layers.some(l => l.state().open);
  }

  /** The 30 s state countdown line, or null. */
  get countdownLine(): string | null {
    return matchCountdownLine();
  }

  // ---- commands ----------------------------------------------------------

  /**
   * A ticket item was double-clicked in the inventory. Returns true when an
   * entry took the item over, so the caller does not consume it.
   */
  useTicket(slot: number, item: Item): boolean {
    for (const layer of this.layers) {
      if (layer.useTicket?.(slot, item)) return true;
    }
    return false;
  }

  /** `NpcWindowResponse` BloodCastle: the Archangel messenger window. */
  openBloodCastle(): void {
    openBloodCastle();
  }

  /** `NpcWindowResponse` DevilSquare: Charon's window. */
  openDevilSquare(): void {
    openDevilSquare();
  }

  enterBloodCastle(grade: number): void {
    enterBloodCastle(grade);
  }

  enterDevilSquare(grade: number): void {
    enterDevilSquare(grade);
  }

  /** The Chaos Castle prompt's OK. */
  enterChaosCastle(): void {
    enterChaosCastle();
  }

  /**
   * `HideAll` for this layer: every entry window and prompt. The two entry
   * windows are opened by an NPC (`NpcWindowResponse` from Charon / the
   * Archangel messenger), so closing one is `SendCloseNpcRequest` as well
   * (`ProcessClosing`, like the shop / quest windows): OpenMU keeps the
   * character in `NpcDialogOpened` until `C1 03 31` arrives, and every later
   * `TalkToNpcRequest` is refused without an answer while it does. The
   * Chaos Castle prompt comes from a ticket, not an NPC.
   */
  closeAll(): void {
    const npcWindowOpen = bloodCastleWindow().open || devilSquareWindow().open;
    closeBloodCastle();
    closeDevilSquare();
    closeChaosCastlePrompt();
    if (!npcWindowOpen) return;
    if (!Store.isOffline) {
      Store.sendToGS(CloseNpcRequestPacket.createPacket().buffer);
    }
    Store.dropNpcTalk();
  }
}

export const events = new Events();

// A hot update that reaches this module must reload the page: Vite would
// otherwise re-execute it and hand later-loaded importers a second instance
// of this singleton (same guard as store.ts).
const hot = (import.meta as { hot?: { decline(): void } }).hot;
if (hot) hot.decline();
