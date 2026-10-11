/**
 * TEMPLATE - copy me to `<name>.ts` and list the layer in `layers.ts`. Never imported.
 * The steps are in this folder's readme.md ("Change it").
 */
import { ENUM_WORLD } from '../../core/types';
import { SoundsManager } from './soundsManager';
import type { Sounds } from './recipes';
import type { SoundLayer } from './layer';

// ---- 1. tuning -------------------------------------------------------------

/** The bed this entry loops. */
const BED: Sounds = 'Sound/aWind';

/** Share of the effects track the bed sits at - under the SFX, never on top. */
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
