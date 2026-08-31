/**
 * Sky lights: the Icarus thunder flash. `MoveHeavenThunder`
 * (ZzzObject.cpp:4204) rolls a strike over the hero every ~2 s and, for one
 * frame, `AddTerrainLight(pos, (L*0.3, L*0.3, L*0.081), 2, …)` with
 * `L = (rand()%4 + 4) * 0.05`. The timing and the sparkles stay in
 * `maps/icarus/sky.ts`, which calls `strikeThunder` when a strike is due.
 */
import type { Scene } from '../libs/babylon/exports';
import { ENUM_WORLD } from '../common/types';
import type { LightingLayer } from './layer';
import { LightSource, type LightRecipe } from './lightSource';

// ---- 1. tuning -------------------------------------------------------------

const MAPS: ReadonlySet<ENUM_WORLD> = new Set([ENUM_WORLD.WD_10ICARUS]);

/** `Luminosity = (rand()%4 + 4) * 0.05f` — 0.20, 0.25, 0.30 or 0.35. */
const THUNDER_LUMI_MIN = 0.2;
const THUNDER_LUMI_STEP = 0.05;
const THUNDER_LUMI_STEPS = 4;

/** `Light = (Luminosity*0.3f, Luminosity*0.3f, Luminosity*0.081f)`. */
const THUNDER_R = 0.3;
const THUNDER_G = 0.3;
const THUNDER_B = 0.081;

/** `AddTerrainLight(…, 2, PrimaryTerrainLight)` — moot, Icarus draws no terrain. */
const THUNDER_TERRAIN_RANGE = 2;

/**
 * How long a strike takes to die away, in seconds.
 *
 * The original's flash is a single frame of `AddTerrainLight` plus a
 * `MODEL_CLOUD` plane with `LifeTime` 2 — two frames at the 25-30 fps it was
 * written for, so ~70 ms. Reproducing that literally at 60-144 fps gives a
 * flash one or two frames long, which reads as a dropped frame rather than as
 * lightning, so the pulse is held to a fixed wall-clock decay instead of a
 * frame count. Instant on, linear out — the recipe's release is the whole
 * life.
 */
const THUNDER_DECAY = 0.22;

/**
 * Tiles the flash reaches, and how hard it is pushed.
 *
 * Neither number is in the original, because in the original this light does
 * not have to carry the effect on its own: what the player sees is the
 * additive `MODEL_CLOUD` plane at `Scale` 10 hanging over the hero. That is
 * not reproduced, Icarus draws no terrain (`MainScene.cpp:402`), and objects
 * read the *baked* lightmap rather than the dynamic delta — so the pulse is a
 * point light sized to wash the islands the hero is standing on: `Light`
 * peaks at 0.105, and the pool turns that into `0.105 × 3 × gain`.
 */
const THUNDER_RANGE = 14;
const THUNDER_GAIN = 12;

function thunderRecipe(lumi: number): LightRecipe {
  return {
    color: [lumi * THUNDER_R, lumi * THUNDER_G, lumi * THUNDER_B],
    range: THUNDER_TERRAIN_RANGE,
    pointRange: THUNDER_RANGE,
    gain: THUNDER_GAIN,
    // Directly overhead; every shadow in Icarus is off anyway.
    heightOffset: 0,
    seconds: THUNDER_DECAY,
    release: THUNDER_DECAY,
  };
}

// ---- 2. state + readers ----------------------------------------------------

const strikes = new Set<LightSource>();

/**
 * Command: a strike at `at` (the hero's position with the original's ±150 MU
 * x jitter already applied by the caller). Rolls the luminosity itself and
 * returns it, for anything that wants to match the flash.
 */
export function strikeThunder(
  scene: Scene,
  at: { x: number; y: number; z: number }
): number {
  const lumi =
    THUNDER_LUMI_MIN +
    Math.floor(Math.random() * THUNDER_LUMI_STEPS) * THUNDER_LUMI_STEP;

  strikes.add(LightSource.attach(scene, thunderRecipe(lumi), { position: { ...at } }));

  return lumi;
}

function update(): void {
  for (const strike of strikes) if (!strike.alive) strikes.delete(strike);
}

function reset(): void {
  strikes.clear();
}

function emitters(): readonly LightSource[] {
  return Array.from(strikes);
}

// ---- 3. the layer ----------------------------------------------------------

export const skyLayer: LightingLayer = {
  name: 'sky',
  maps: MAPS,
  update,
  reset,
  emitters,
};
