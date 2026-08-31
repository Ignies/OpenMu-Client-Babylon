/**
 * TEMPLATE — copy this file to `<name>.ts`, fill in the blanks, add the layer
 * to `layers.ts`. Never imported; it only exists to be copied.
 *
 * Every quest entry file has the same three parts, in this order:
 *
 *   1. Tuning constants at the top, each with a comment saying what it is in
 *      real units (seconds, tiles, packet codes) and why it has that value.
 *   2. Module state + the functions that read it. State lives here, not in
 *      the facade. State a window renders is a MobX `observable` so React
 *      re-renders; readers are plain functions (`templateOpen()`).
 *      Packet handlers are `EventBus.on('<PacketName>', …)` registered at
 *      module load, like `social.ts`.
 *   3. The exported `QuestLayer` at the bottom, wiring `update` / `reset`.
 *
 * If the entry opens a window, the window lives in
 * `ui/pages/worldPage/components/quests/` and reads this file's state.
 * If it reacts to a packet, the handler is here — never in `logic.ts`.
 */
import { observable, runInAction } from 'mobx';
import { ENUM_WORLD } from '../common/types';
import type { QuestLayer } from './layer';

// ---- 1. tuning -------------------------------------------------------------

/** Seconds between two re-checks of whatever this entry watches. */
const POLL_SECONDS = 1;

/** Maps this exists on. */
const MAPS: ReadonlySet<ENUM_WORLD> = new Set([ENUM_WORLD.WD_0LORENCIA]);

// ---- 2. state + readers ----------------------------------------------------

const state = observable({
  /** Whether the entry's window is up. */
  open: false,
});

let sinceLastPoll = 0;

/** Whether the template's window is showing. */
export function templateOpen(): boolean {
  return state.open;
}

/** Command: show / hide the window. */
export function showTemplate(open: boolean): void {
  runInAction(() => {
    state.open = open;
  });
}

function update(map: ENUM_WORLD, dt: number): void {
  if (!MAPS.has(map)) return;

  sinceLastPoll += dt;
  if (sinceLastPoll < POLL_SECONDS) return;
  sinceLastPoll = 0;

  // Replace with whatever this entry watches each poll.
}

function reset(): void {
  sinceLastPoll = 0;
  showTemplate(false);
}

// ---- 3. the layer ----------------------------------------------------------

export const templateLayer: QuestLayer = {
  name: 'template',
  maps: MAPS,
  update,
  reset,
};
