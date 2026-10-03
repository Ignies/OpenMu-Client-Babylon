/** TEMPLATE - copy-me file for a new quest entry; never imported.
 * Steps: readme.md "Change it". */
import { observable, runInAction } from 'mobx';
import { ENUM_WORLD } from '../../core/types';
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
