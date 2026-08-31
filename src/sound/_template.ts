/**
 * TEMPLATE — copy this file to `<name>.ts`, fill in the blanks, add the layer
 * to `layers.ts`. Never imported; it only exists to be copied.
 *
 * Every sound entry has the same three parts, in this order:
 *
 *   1. Tuning constants / data tables at the top, each with a comment saying
 *      what it is in real units (seconds, 0…1 of the track, tiles) and why.
 *   2. Module state + the readers / commands over it. State lives here, not
 *      in the facade. A looping entry (a bed, the music) has an `update`; a
 *      one-shot entry (a click, a swing) is command-only.
 *   3. The exported `SoundLayer` at the bottom, wiring `update` / `reset`.
 *
 * Everything audible goes through the mixer, `libs/soundsManager.ts`:
 * `playAmbientLoop` / `stopAmbientLoop` for beds, `playMusic` for tracks,
 * and `playSfx` (this folder's `listener.ts`) for positioned one-shots.
 */
import { ENUM_WORLD } from '../common/types';
import { SoundsManager } from '../libs/soundsManager';
import type { Sounds } from './recipes';
import type { SoundLayer } from './layer';

// ---- 1. tuning -------------------------------------------------------------

/** The bed this entry loops. */
const BED: Sounds = 'Sound/aWind';

/** Share of the effects track the bed sits at — under the SFX, never on top. */
const VOLUME = 0.35;

/** Maps this exists on. */
const MAPS: ReadonlySet<ENUM_WORLD> = new Set([ENUM_WORLD.WD_0LORENCIA]);

// ---- 2. state + readers ----------------------------------------------------

let playing = false;

/** Whether the bed is sounding right now. */
export function templatePlaying(): boolean {
  return playing;
}

function update(map: ENUM_WORLD, _dt: number): void {
  // Replace with whatever drives this entry: a tile, a packet, a schedule.
  const wanted = MAPS.has(map) && SoundsManager.pageInteracted;

  if (wanted) SoundsManager.playAmbientLoop(BED, VOLUME);
  else if (playing) SoundsManager.stopAmbientLoop(BED);

  playing = wanted;
}

function reset(): void {
  if (playing) SoundsManager.stopAmbientLoop(BED);
  playing = false;
}

// ---- 3. the layer ----------------------------------------------------------

export const templateLayer: SoundLayer = {
  name: 'template',
  maps: MAPS,
  update,
  reset,
};
