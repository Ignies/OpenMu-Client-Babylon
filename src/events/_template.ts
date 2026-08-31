/**
 * TEMPLATE — copy this file to `<name>.ts`, fill in the blanks, add the layer
 * to `layers.ts`. Never imported; it only exists to be copied.
 *
 * Every event file has the same three parts, in this order:
 *
 *   1. Tuning constants at the top, each with a comment saying what it is in
 *      real units (seconds, maps, counts) and why it has that value.
 *   2. Module state + the functions that read it. State lives here, not in
 *      the facade; it is a MobX `observable` so the HUD re-renders, and
 *      readers are plain functions (`templateTimer()`). Packet handlers
 *      (`EventBus.on('<PacketName>')`) resync the state; `update` counts.
 *   3. The exported `EventLayer` at the bottom, wiring `update` / `reset` /
 *      `state` and, for a ticket-opened event, `useTicket`.
 *
 * If the event has a window or HUD, draw it in
 * `ui/pages/worldPage/components/events/` reading this file's functions.
 * If an NPC opens it, add one `case` to `NpcWindowResponse` in `logic.ts`
 * calling a facade command. If a packet feeds it, subscribe here.
 */
import { observable, runInAction } from 'mobx';
import { ENUM_WORLD } from '../common/types';
import type { Item } from '../ecs/world';
import type { EventLayer } from './layer';

// ---- 1. tuning -------------------------------------------------------------

/** Maps this event runs on. */
const MAPS: ReadonlySet<ENUM_WORLD> = new Set([ENUM_WORLD.WD_0LORENCIA]);

/** Seconds a match lasts when the server has not said otherwise. */
const MATCH_SECONDS = 15 * 60;

/** Ticket item that opens the event from the inventory. */
const TICKET = { group: 14, num: 0 };

// ---- 2. state + readers ----------------------------------------------------

const state = observable(
  {
    open: false,
    seconds: 0,
    running: false,
  },
  {},
  { deep: false }
);

/** The clock the HUD draws. */
export function templateTimer(): { seconds: number; running: boolean } {
  return { seconds: state.seconds, running: state.running };
}

export function openTemplate(): void {
  runInAction(() => {
    state.open = true;
  });
}

export function closeTemplate(): void {
  runInAction(() => {
    state.open = false;
  });
}

function useTicket(_slot: number, item: Item): boolean {
  if (item.group !== TICKET.group || item.num !== TICKET.num) return false;
  // Send the opening-state request here.
  return true;
}

function update(map: ENUM_WORLD, dt: number): void {
  if (!state.running || !MAPS.has(map)) return;
  runInAction(() => {
    state.seconds = Math.max(0, state.seconds - dt);
  });
}

function reset(): void {
  runInAction(() => {
    state.open = false;
    state.seconds = MATCH_SECONDS;
    state.running = false;
  });
}

// ---- 3. the layer ----------------------------------------------------------

export const templateLayer: EventLayer = {
  name: 'template',
  maps: MAPS,
  update,
  reset,
  state: () => ({ open: state.open, running: state.running }),
  useTicket,
};
