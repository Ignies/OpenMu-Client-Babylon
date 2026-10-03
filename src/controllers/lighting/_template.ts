/**
 * TEMPLATE - copy me to `<name>.ts` and list the layer in `layers.ts`. Never imported.
 * The steps are in this folder's readme.md ("Change it").
 */
import type { Scene } from '../render/babylon/exports';
import type { ENUM_WORLD } from '../../core/types';
import { maps } from '../maps';
import type { LightingLayer } from './layer';
import { LightSource, type LightRecipe } from './lightSource';
import { flame } from './recipes';

// ---- 1. tuning -------------------------------------------------------------

/**
 * Maps this exists on: the ones whose entry asks for it - a field on
 * `MapLighting` (`mapLighting.ts`) set in the map's folder, never
 * `if (map === …)` here. Live, so nothing reads the maps at load.
 */
const MAPS: ReadonlySet<ENUM_WORLD> = maps.worldSet(
  layer => layer.lighting?.thunder === true
);

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
