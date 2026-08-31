/**
 * Item sparkle — the infrequent star glints an excellent item throws from
 * random points of its surface. The original's `CreateShiny`
 * (ZzzObject.cpp:6223, called from `MoveItems` :6268): every 48th tick two
 * `BITMAP_SHINY` particles at a point 16–48 cm out and 16–48 cm up from the
 * object, turned by its yaw. On a worn item the point is on the body instead.
 *
 * One counter per live sparkle; the glints themselves are pooled through the
 * shared `SHINY_GLINT` particle system, so a square of excellent drops costs
 * one draw and no allocation.
 *
 * Driven by: `effects.spawn('itemSparkle', …)` from
 * `ecs/systems/itemGlowSystem.ts` (excellent drops and wearers). Read by: nobody.
 */
import { Vector3, type Scene } from '../libs/babylon/exports';
import { LiveList, TICK, emitBurst, pointSource, type PointSource } from './core';
import { SHINY_GLINT } from './recipes';
import type { EffectHandle, EffectLayer } from './layer';

// ---- 1. tuning -------------------------------------------------------------

/** `o->SubType++ % 48 == 0`: one burst every 48 ticks. */
const PERIOD_SECONDS = 48 * TICK;

/** Two particles a burst (SubType 0 and 1). */
const PER_BURST = 2;

/** `rand() % 32 + 16` cm: how far out / up from a drop the glint sits. */
const DROP_OFFSET_MIN = 0.16;
const DROP_OFFSET_MAX = 0.48;

/** A wearer's body: the cylinder the glint is placed on (itemCrackle's). */
const BODY_RADIUS = 0.27;
const BODY_BOTTOM = 0.2;
const BODY_TOP = 1.15;

// ---- 2. state + readers ----------------------------------------------------

export type ItemSparkleKind = 'character' | 'drop';

export interface ItemSparkleOptions {
  kind: ItemSparkleKind;
  /** The item's position; a wearer moves, a drop falls in. */
  follow?: PointSource;
  /** The drop's yaw, radians (MU convention): the offset is turned by it. */
  yaw?: () => number;
  /** Ends when true (the wearer left, the drop was picked up). */
  until?: () => boolean;
}

const live = new LiveList();

/** How many sparkles are ticking (debug). */
export function itemSparkleCount(): number {
  return live.size;
}

const tmp = new Vector3();

function spawn(scene: Scene, at: Vector3, opts: ItemSparkleOptions): EffectHandle {
  const source = opts.follow ?? pointSource(at);
  // A random phase so a pile of drops does not glint in unison.
  let countdown = Math.random() * PERIOD_SECONDS;
  return live.push({
    update(dt) {
      if (opts.until?.()) return false;
      countdown -= dt;
      if (countdown > 0) return true;
      countdown += PERIOD_SECONDS;

      source(tmp);
      if (opts.kind === 'drop') {
        const out = DROP_OFFSET_MIN + Math.random() * (DROP_OFFSET_MAX - DROP_OFFSET_MIN);
        const up = DROP_OFFSET_MIN + Math.random() * (DROP_OFFSET_MAX - DROP_OFFSET_MIN);
        const yaw = opts.yaw?.() ?? 0;
        tmp.x += Math.sin(yaw) * out;
        tmp.z += Math.cos(yaw) * out;
        tmp.y += up;
      } else {
        const angle = Math.random() * Math.PI * 2;
        tmp.x += Math.cos(angle) * BODY_RADIUS;
        tmp.z += Math.sin(angle) * BODY_RADIUS;
        tmp.y += BODY_BOTTOM + Math.random() * (BODY_TOP - BODY_BOTTOM);
      }
      emitBurst(scene, SHINY_GLINT, tmp, PER_BURST);
      return true;
    },
    release() {},
  });
}

function update(_map: number, dt: number): void {
  live.update(dt);
}

function reset(): void {
  live.clear();
}

// ---- 3. the layer ----------------------------------------------------------

export const itemSparkleLayer: EffectLayer<ItemSparkleOptions, 'itemSparkle'> = {
  name: 'itemSparkle',
  update,
  reset,
  spawn,
};
