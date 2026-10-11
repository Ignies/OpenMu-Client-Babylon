import type { LightEmitter } from '@/controllers/lighting';
import { isOn } from '@/controllers/fidelity';
import type { MeshAnimations } from '@/controllers/render';
import { createFire } from '../shared/lights';
import { rollTenths } from '../shared/meshAnimation';

/**
 * Devias (`WD_2DEVIAS`, `World3`/`Object3`), the plain-data half. Devias has
 * no effect-only types and no particle emitters of its own (the candelabra and
 * hearths are object classes bound in `create.ts`): the blend meshes, and the
 * fire and candelabra lights below.
 */

/**
 * CreateObject, ZzzObject.cpp:4624-4677 (World 3 / Object3).
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

/** `MoveObject`: 78 rolls its blend mesh's light every frame (ZzzObject.cpp:3858-3860). */
export const DEVIAS_MESH_ANIMATIONS: MeshAnimations = {
  78: { mesh: 3, kind: 'blend', light: rollTenths(4, 4) },
};

/**
 * Devias (Object3). The placements were checked against EncTerrain3.obj:
 *  - 36 fireplace + 66 fire sit on the same spot (tavern 232/27.5,
 *    202.5/62, 225/44.5); the fire gets the flame, the hearth nothing.
 *    66 also burns alone as the camp fires (11.5/77.5, 174/192, …). The
 *    original's 66 is `CreateFire(0, o, 0, 0, 50)` (ZzzObject.cpp:3874-3876):
 *    fire and a range-4 light 50 up, `createFire`'s, no flare; the flare is
 *    ours (`lampFlares`).
 *  - 54 / 56 candelabra are DeviasCandleObject: flames and light come from
 *    the wick bones (DEVIAS_CANDELABRA below), nothing is needed here.
 */
/** Above this object scale a Devias 66 is a camp fire, below it a hearth. */
const DEVIAS_HEARTH_SCALE = 0.9;

const HEARTH_FLARE: NonNullable<LightEmitter['sprite']> = { scale: 4.5, color: [1, 0.45, 0.15] };

export const DEVIAS_LIGHTS: Partial<Record<number, readonly LightEmitter[]>> = {
  66: [
    {
      ...createFire([0, 0, 50]),
      pointRange: 8,
      get sprite() {
        return isOn('lampFlares') ? HEARTH_FLARE : undefined;
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
 * Ours (`lampFlares`): the original gives the candelabra a BlendMesh and no
 * light (ZzzObject.cpp:4658-4660).
 */
const CANDELABRA_GROUND: LightEmitter['terrain'] = {
  range: 5.5,
  color: [1, 0.66, 0.3],
  flicker: { min: 0.45, max: 0.75, steps: 4 },
  falloff: 1.4,
  floorGain: 1.3,
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
  get terrain() {
    return isOn('lampFlares') ? CANDELABRA_GROUND : undefined;
  },
};
