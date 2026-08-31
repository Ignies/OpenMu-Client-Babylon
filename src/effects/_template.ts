/**
 * TEMPLATE — copy this file to `<name>.ts`, fill in the blanks, add the layer
 * to `layers.ts`. Never imported; it only exists to be copied.
 *
 * Every effect file has the same three parts, in this order:
 *
 *   1. Tuning constants at the top, each with a comment saying what it is in
 *      real units (seconds, tiles, 0…1, linear RGB) and why it has that value.
 *   2. Module state (a `LiveList` from core.ts plus any pool this entry owns)
 *      and the functions that read it. State lives here, not in the facade.
 *   3. The exported `EffectLayer` at the bottom, wiring `update` / `reset` /
 *      `spawn`.
 *
 * Pools come from core.ts: `additiveMaterial` + `acquireCard` for a handful
 * of billboards, `particleSystemFor` / `emitBurst` / `Emitter` for many.
 * Shared colours, textures and particle recipes go in `recipes.ts`.
 */
import type { Scene, Vector3 } from '../libs/babylon/exports';
import { LiveList, acquireCard, additiveMaterial, releaseCard, fadeOut, WHITE, type RGB, type Card } from './core';
import type { EffectHandle, EffectLayer } from './layer';

// ---- 1. tuning -------------------------------------------------------------

/** Seconds the card stays; the original's 20-tick lifetime at 25 Hz. */
const SECONDS = 0.8;

/** Card edge in tiles: 60 cm, a hand-sized flash. */
const SIZE = 0.6;

// ---- 2. state + readers ----------------------------------------------------

export interface TemplateOptions {
  texture: string;
  colour?: RGB;
}

const live = new LiveList();

/** How many of these are running (debug). */
export function templateCount(): number {
  return live.size;
}

function spawn(scene: Scene, at: Vector3, opts: TemplateOptions): EffectHandle {
  const material = additiveMaterial(scene, opts.texture, opts.colour ?? WHITE);
  const card: Card = acquireCard(scene, material);
  card.position.copyFrom(at);
  let t = 0;
  return live.push({
    update(dt) {
      t += dt;
      const p = t / SECONDS;
      card.scaling.setAll(SIZE * fadeOut(p));
      return p < 1;
    },
    release() {
      releaseCard(scene, card);
    },
  });
}

function update(_map: number, dt: number): void {
  live.update(dt);
}

function reset(): void {
  live.clear();
}

// ---- 3. the layer ----------------------------------------------------------

export const templateLayer: EffectLayer<TemplateOptions> = {
  name: 'template',
  update,
  reset,
  spawn,
};
