/**
 * TEMPLATE — copy this file to `<name>.ts`, fill in the blanks, add the layer
 * to `layers.ts`. Never imported; it only exists to be copied.
 *
 * Every entry file has the same three parts, in this order:
 *
 *   1. Tuning constants at the top, each with a comment saying what it is in
 *      real units (tiles, seconds, linear RGB) and why it has that value. The
 *      entry's recipe table lives here too — it is data.
 *   2. Module state + the functions that read or command it. State lives
 *      here, not in the facade. A light is made with `LightSource.attach`;
 *      keep the handle so `emitters()` can report it.
 *   3. The exported `LightingLayer` at the bottom, wiring `update` / `reset` /
 *      `emitters`.
 *
 * Whatever *triggers* the light stays where it happens (an ECS system, a
 * packet handler, a map object class) and calls this file's command — or the
 * facade's wrapper of it when more than one consumer needs it.
 */
import type { Scene } from '../libs/babylon/exports';
import { ENUM_WORLD } from '../common/types';
import type { LightingLayer } from './layer';
import { LightSource, type LightRecipe } from './lightSource';
import { flame } from './recipes';

// ---- 1. tuning -------------------------------------------------------------

/** Maps this exists on. Data — never `if (map === …)` inside logic. */
const MAPS: ReadonlySet<ENUM_WORLD> = new Set([ENUM_WORLD.WD_0LORENCIA]);

/** Tiles above the anchor where the point light hangs. */
const HEIGHT = 0.5;

/** The recipe table: replace the key with whatever identifies a thing here. */
const RECIPES: Partial<Record<number, LightRecipe>> = {
  0: { ...flame(3, 1.0), heightOffset: HEIGHT },
};

// ---- 2. state + readers ----------------------------------------------------

const sources = new Set<LightSource>();

/** Command: light thing `kind` at a point. */
export function lightTemplate(
  scene: Scene,
  kind: number,
  at: { x: number; y: number; z: number }
): void {
  const recipe = RECIPES[kind];
  if (!recipe) return;

  sources.add(LightSource.attach(scene, recipe, { position: { ...at } }));
}

function update(_map: ENUM_WORLD, _dt: number): void {
  for (const source of sources) if (!source.alive) sources.delete(source);
}

function reset(): void {
  sources.clear();
}

function emitters(): readonly LightSource[] {
  return Array.from(sources);
}

// ---- 3. the layer ----------------------------------------------------------

export const templateLayer: LightingLayer = {
  name: 'template',
  maps: MAPS,
  update,
  reset,
  emitters,
};
