import type { Emission } from '@/controllers/fx/effectParticles';
import type { LightEmitter } from '@/controllers/lighting/mapObjectLights';
import type { MeshAnimations } from '@/controllers/render';
import { saw } from '../shared/meshAnimation';

/**
 * Kanturu Relics (`WD_38KANTURU_2ND`, `World39`/`Object39`), the plain-data
 * half. Nothing here may import the scene.
 *
 * EncTerrain39.obj places 2014 objects of 70 types. **Object39 has holes**:
 * it ships 64 models, and types 21, 22, 25, 28, 39, 40, 42, 43, 51, 69 and
 * 84 have no `Object<n+1>.bmd` (37 records between them, mostly single
 * markers at the far east edge). Their loads fail and are logged; 42 is the
 * one with C++ behind it - a UV scroll that can never run - and 51 is in the
 * hidden list anyway.
 *
 * The C++ is GM_Kanturu_2nd.cpp: `Create_Kanturu2nd_Object` (:34-49),
 * `Move_Kanturu2nd_Object` (:212-272), `Render_Kanturu2nd_ObjectVisual`
 * (:329-525).
 */

/** No `o->BlendMesh` writes; the 10/38 sines and the 42 scroll are in the `render.meshAnimations` rows. */
export const KANTURU2_BLEND_MESHES: Readonly<Record<number, number>> = {};

/**
 * `Move_Kanturu2nd_Object` :246-268 hides 45-56 and 65. The render side
 * gives them (:388-525):
 *  - **45** (×1) `BITMAP_CLOUD` SubType 1, **46** (×0) SubType 2, **47**
 *    (×23) / **49** (×4) SubType 7 / 1 every tick, **48** (×60) SubType 10,
 *    **50** (×18) / **51** (×4) SubType 11 - the steam and mist banks.
 *  - **52** (×0) `WATERFALL_3` SubType 7, **53** (×34)
 *    `BITMAP_TWINTAIL_WATER` - the incubator spray.
 *  - **54** (×18): nothing; **55** (×32): `MODEL_FENRIR_THUNDER` effect
 *    model (not built); **56** (×13), **65** (×2): nothing.
 */
export const KANTURU2_EFFECT_ONLY_TYPES: readonly number[] = [
  45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 65,
];

/**
 * The steam. `cloud21` for every cloud SubType; `waterfall5_9` for the spray.
 *
 * Only the three that repeat are here. **45**, **46**, **47** and **49**
 * (:387-448) sit behind `if (o->HiddenMesh != -2)`, which the move hook sets
 * on all of them every frame, so they fire once at most and what they fire is
 * 20 near-black sprites - nothing to draw, and a stream of white in its place
 * fogs the map in. **48**, **50** and **51** are `rand_fps_check(3)` with no
 * such guard, so they keep their row, with the light the C++ gives them: a
 * flat 0.2 grey on 48, and near-black blue and red on 50/51 (:449-470,
 * where the third channel is `rand()%3 * 0.01` over a 0.02/0.01 floor).
 */
export const KANTURU2_EMISSIONS: Partial<Record<number, readonly Emission[]>> =
  {
    48: [{ kinds: ['cloud21'], every: 3, light: [0.2, 0.2, 0.2] }],
    50: [{ kinds: ['cloud21'], every: 3, light: [0, 0.01, 0.03] }],
    51: [{ kinds: ['cloud21'], every: 3, light: [0.02, 0, 0] }],
    52: [{ kinds: ['waterfall5_9'], every: 2 }],
    53: [{ kinds: ['waterfall5_9'], every: 3, scale: 0.5 }],
  };

/**
 * `Render_Kanturu2nd_ObjectVisual`:
 *  - **4** (×21), :335-346: `BITMAP_LIGHT` + two `KANTURU_2ND_EFFECT1`
 *    sprites at bone 1, sized `fLumi / 3.2` - the relic lamps.
 *  - **8** (×18), :347-371: a `BITMAP_SPARK + 1` (Spark03.jpg) sprite at
 *    bone 4, 10 across with no `* o->Scale`, white `fLumi = (sin(WorldTime *
 *    0.001) + 1) * 0.5` - the power conduits; its `BITMAP_ENERGY` particles
 *    and thunder joints are not ported. Bone 4 rides 21-151 up over the
 *    clip; the card sits at the middle of the ride.
 *
 * No `AddTerrainLight` anywhere in Kanturu 2nd; sprites only.
 */
export const KANTURU2_LIGHTS: Partial<Record<number, readonly LightEmitter[]>> =
  {
    4: [
      {
        sprite: {
          scale: 1.4,
          color: [0.6, 0.8, 1],
          pulse: { speed: 1.5, amount: 0.3, base: 0.8 },
        },
      },
    ],
    8: [
      {
        offset: [0, 0, 94],
        bone: true,
        sprite: {
          scale: 10,
          color: [1, 1, 1],
          pulse: { speed: 0.001, amount: 0.5, base: 0 },
          texture: 'spark1',
          unscaled: true,
        },
      },
    ],
  };

/**
 * Kanturu Relics (GM_Kanturu_2nd.cpp:219-241): 10's clamped sine, 38's
 * sine, 42's diagonal scroll (no model for 42 in Object39 - kept to match
 * the source).
 */
export const KANTURU2_MESH_ANIMATIONS: MeshAnimations = {
  10: {
    mesh: 0,
    kind: 'blend',
    light: t => Math.min(0.9, Math.max(0.1, Math.sin(t * 0.0015) + 1)),
  },
  38: { mesh: 0, kind: 'blend', light: t => Math.sin(t * 0.001) + 1 },
  42: {
    mesh: 0,
    kind: 'blend',
    u: saw(10000, 0.0002),
    v: saw(10000, 0.0002),
  },
};
