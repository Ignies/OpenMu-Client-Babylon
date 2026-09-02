import type { ENUM_WORLD } from '../common/types';
import type { Item } from '../ecs/world';

/**
 * The contract every event entry implements: one file per event (Blood
 * Castle, Devil Square, Chaos Castle, the shared notices), one exported
 * `EventLayer` per file, listed once in `layers.ts`. Copy `_template.ts` for the recipe.
 *
 * The four common-core fields (`name`, `maps?`, `update?`, `reset?`) are
 * spelled exactly like every other system's contract.
 * The extras are what every event must answer: a `state()` snapshot for the
 * HUD and tools, and — optionally — the inventory ticket that opens it.
 */
export interface EventLayer {
  /** Unique camelCase, identical to the file name. */
  readonly name: string;

  /** Event maps this entry tracks (the timer HUD, scores). Omit = every map. */
  readonly maps?: ReadonlySet<ENUM_WORLD>;

  /**
   * Once a frame, in `layers.ts` order, before anything reads the events.
   * `dt` is seconds; timers count down here, packets only resync them.
   */
  update?(map: ENUM_WORLD, dt: number): void;

  /**
   * Map changed: drop the match being tracked (`CreateEventMatch` recreates
   * the match object on every warp) and close any entry window.
   */
  reset?(): void;

  /** Snapshot for the HUD: is a window of this entry up, is a match running. */
  state(): EventEntryState;

  /**
   * A ticket item was double-clicked in the inventory (`CNewUIMyInventory`
   * → `SendRequestEventRemainTime` in the original). Return true when the
   * item is this event's ticket and the request was taken over.
   */
  useTicket?(slot: number, item: Item): boolean;

  /**
   * The hero reached and clicked an NPC. Return true when the NPC belongs to
   * this event (the Crywolf statue) and the talk was taken over, so no
   * `TalkToNpcRequest` goes out.
   */
  useNpc?(npc: { netId: number; name: string; npcType: number }): boolean;
}

export type EventEntryState = {
  /** A window or prompt of this entry is on screen. */
  readonly open: boolean;
  /** The hero is on one of the entry's maps with a match being tracked. */
  readonly running: boolean;
};
