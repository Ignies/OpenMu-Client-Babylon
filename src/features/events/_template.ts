/** TEMPLATE - copy-me file for a new event; never imported.
 * Steps: readme.md "Change it". */
import { observable, runInAction } from 'mobx';
import { ENUM_WORLD } from '../../core/types';
import type { Item } from '../../ecs/world';
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
