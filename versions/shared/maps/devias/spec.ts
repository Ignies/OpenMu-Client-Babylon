import type { LightEmitter } from '@/controllers/lighting';
import { createFire } from '../shared/lights';

/**
 * Devias (`WD_2DEVIAS`, `World3`/`Object3`), the plain-data half. Devias has
 * no effect-only types and no particle emitters of its own (the candelabra and
 * hearths are object classes bound in `create.ts`): the blend meshes, and the
 * fire and candelabra lights below.
 */

/**
 * CreateObject, ZzzObject.cpp:4643-4651 (World 3 / Object3).
 *
 * 19 is the aurora curtain that hangs over the ravines - 136 of them on the
 * map, five tiles up. The original puts it in the same `BlendMesh = 0` case
 * as 92 and 93 (:4646) and this table had dropped it, so it was drawn as an
 * ordinary surface: no light of its own, and hazed as if it were the ground
 * behind it rather than the glow in front of it.
 */
export const DEVIAS_BLEND_MESHES: Readonly<Record<number, number>> = {
  19: 0,
  92: 0,
  93: 0,
  54: 1,
  56: 1,
  78: 3,
};

/**
 * Devias (Object3). The original lights nothing here; these are ours, so
 * the placements were checked against EncTerrain3.obj first:
 *  - 36 fireplace + 66 fire sit on the same spot (tavern 232/27.5,
 *    202.5/62, 225/44.5); the fire gets the flame, the hearth nothing.
 *    66 also burns alone as the camp fires (11.5/77.5, 174/192, …).
 *  - 54 / 56 candelabra are DeviasCandleObject: flames and light come from
 *    the wick bones (DEVIAS_CANDELABRA below), nothing is needed here.
 */
/** Above this object scale a Devias 66 is a camp fire, below it a hearth. */
const DEVIAS_HEARTH_SCALE = 0.9;

export const DEVIAS_LIGHTS: Partial<Record<number, readonly LightEmitter[]>> = {
  66: [
    {
      ...createFire([0, 0, 30]),
      pointRange: 8,
      sprite: { scale: 4.5, color: [1, 0.45, 0.15] },
      terrain: {
        range: 5,
        color: [1, 0.6, 0.35],
        flicker: { min: 0.6, max: 1, steps: 5 },
      },
      // EncTerrain3.obj carries 66 in two sizes and the emitter multiplies
      // its sprites by the object's own scale, so one recipe cannot serve
      // both:
      //  - Hearths (0.70-0.78, always sharing a spot with a 36) come out
      //    small, so spawn twice a tick to fill the grate and keep the smoke
      //    tight - it is going up a chimney.
      //  - Camp fires (1.00 at 11.5/77.5, 108.6/242.4, 174/192, 162.6/233.6,
      //    plus the 0.72 one at 238.5/194.5) already have the mass at full
      //    size, so one a tick is enough and the second only burned fill
      //    rate. They spend it on wider, more frequent smoke instead -
      //    that is what reads at distance against snow.
      emissions: scale =>
        scale < DEVIAS_HEARTH_SCALE
          ? [
              { kinds: ['fire0', 'fire0b'], every: 1, count: 2, jitter: 10 },
              { kinds: ['smoke0'], every: 5, jitter: 10, scale: 1.4 },
            ]
          : [
              { kinds: ['fire0', 'fire0b'], every: 1, count: 1, jitter: 16 },
              { kinds: ['smoke0'], every: 3, jitter: 18, scale: 1.9 },
            ],
    },
  ],
};

/**
 * Devias standing candelabra (Object3 types 54 / 56), lit from the average
 * of the three wick bones by `DeviasCandleObject`. Lorencia's table candle
 * (150 above) minus the fixed offset, reaching further and yellower: the
 * wicks sit ~1.7 tiles over the floor. A lower peak over a longer, softer
 * falloff - ~0.41 at two tiles, ~0.24 at three, ~0.13 at four - now that the
 * delta texture has a shoulder (`DELTA_KNEE`) and the interior key lifts the
 * floor between pools (`INTERIOR_GROUND_KEY`, sceneLook.ts).
 */
export const DEVIAS_CANDELABRA: LightEmitter = {
  pointRange: 7,
  pointDrop: 0,
  pointGain: 1.4,
  wander: 0.05,
  terrain: {
    range: 5.5,
    color: [1, 0.66, 0.3],
    flicker: { min: 0.45, max: 0.75, steps: 4 },
    falloff: 1.4,
    floorGain: 1.3,
  },
};
