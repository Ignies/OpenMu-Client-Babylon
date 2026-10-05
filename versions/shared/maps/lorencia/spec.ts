import type { Emission } from '@/controllers/fx/effectParticles';
import type { LightEmitter } from '@/controllers/lighting';
import { isOn } from '@/controllers/fidelity';
import { createFire } from '../shared/lights';
import type { MapTerrain } from '@/controllers/terrain';
import {
  MODEL_CANDLE,
  MODEL_FURNITURE01,
  MODEL_POSE_BOX,
  MODEL_TREE01,
} from '@versions/shared/objects/enum';
import { pose, sit } from '../shared/terrain';

/**
 * Lorencia (`WD_0LORENCIA`, `World1`/`Object1`), the plain-data half: the
 * per-type tables the renderer reads through the `maps` facade. Nothing here
 * may import the scene.
 */

/** `CreateObject`'s `BlendMesh` assignments for Object1 (ZzzObject.cpp:4643-4651). */
export const LORENCIA_BLEND_MESHES: Readonly<Record<number, number>> = {
  117: 4,
  118: 8,
  119: 2,
  122: 4,
  105: 3,
  52: 1,
  98: 2,
  90: 1,
  150: 1,
};

/** The three chimney / vent types drawn as smoke only. */
export const LORENCIA_EFFECT_ONLY_TYPES: readonly number[] = [130, 131, 132];

export const LORENCIA_EMISSIONS: Partial<Record<number, readonly Emission[]>> = {
  131: [{ kinds: ['smoke0'], every: 2, jitter: 8 }],

  132: [{ kinds: ['smoke2'], every: 2, jitter: 8 }],
};

/**
 * Lorencia 90, the street lamp (ZzzObject.cpp:3781-3785): `Luminosity =
 * (rand() % 2 + 6) * 0.1`, then `AddTerrainLight(x, y, (L, 0.8L, 0.6L), 3)`.
 * The colour and the two-step 0.6/0.7 roll are the original's; the flare
 * (`lampFlares`) and the point light are ours.
 *
 * The original hangs its light on the post's map tile. `StreetLight01` puts
 * the lit part - the `streetlight_brightness2` glass, the model's second mesh
 * - out on an arm: bind-pose centre (0, -0.62, 2.26) tiles, 2.26 up and 0.62
 * along the arm, while the post itself stands at y 0. Lighting the tile under
 * the post left the pool a lamp's length from the lamp and the glass unlit,
 * so the row carries the offset and the flare and the pool both ride the
 * glass.
 */
const STREET_LAMP_GLASS: readonly [number, number, number] = [0, -62, 226];

const STREET_LAMP_COLOR: readonly [number, number, number] = [1, 0.8, 0.6];

const STREET_LAMP_FLARE: NonNullable<LightEmitter['sprite']> = {
  scale: 1.8,
  color: STREET_LAMP_COLOR,
  pulse: { speed: 0.0011, amount: 0.06, base: 0.34 },
};

/**
 * Ours, on 150 the table candle: the original gives it a BlendMesh and its
 * `AddTerrainLight` alone (ZzzObject.cpp:3810-3814, :4587-4590).
 */
const CANDLE_FLARE: NonNullable<LightEmitter['sprite']> = { scale: 3, color: [1, 0.62, 0.22] };

export const LORENCIA_LIGHTS: Partial<Record<number, readonly LightEmitter[]>> = {
  50: [createFire([0, 0, 200])],

  51: [createFire([0, -30, 60])],

  52: [createFire([0, 0, 60])],

  55: [createFire([-150, -150, 140]), createFire([150, -150, 140])],

  80: [createFire([90, -200, 30]), createFire([90, 200, 30])],

  90: [
    {
      offset: STREET_LAMP_GLASS,
      get sprite() {
        return isOn('lampFlares') ? STREET_LAMP_FLARE : undefined;
      },
      pointRange: 6,
      pointGain: 1.5,
      terrain: {
        range: 3,
        color: STREET_LAMP_COLOR,
        flicker: { min: 0.6, max: 0.7, steps: 2 },
        falloff: 1.4,
        floorGain: 1.8,
      },
    },
  ],

  130: [createFire([0, 0, 0])],

  150: [
    {
      offset: [0, 0, 78],
      pointDrop: -0.12,
      get sprite() {
        return isOn('lampFlares') ? CANDLE_FLARE : undefined;
      },
      pointRange: 5,
      pointGain: 1.6,
      wander: 0.05,
      terrain: {
        range: 5,
        color: [1, 0.52, 0.16],
        flicker: { min: 0.3, max: 0.6, steps: 4 },
        falloff: 1.6,
        floorGain: 2.5,
      },
    },
  ],
};

/**
 * Lorencia's ground rows (`MapTerrain`): the seats and the pose box, and the
 * pub objects the shipped `EncTerrain1.obj` sinks into the floor.
 */
export const LORENCIA_TERRAIN: MapTerrain = {
  rest: {
    [MODEL_POSE_BOX]: pose(true),
    [MODEL_TREE01 + 6]: sit(false),
    [MODEL_FURNITURE01 + 5]: sit(true),
    [MODEL_FURNITURE01 + 6]: sit(false),
  },
  leanCursor: [MODEL_POSE_BOX],
  objectFixups: [
    { type: MODEL_FURNITURE01 + 3, x: 12494.65, y: 12235.38, z: 165 },
    { type: MODEL_FURNITURE01 + 3, x: 12483.23, y: 12235.69, z: 165 },

    { type: MODEL_CANDLE, x: 12531.0, y: 12253.23, z: 250 },
  ],
};
