import type { Emission } from '../../common/effectParticles';
import type { LightEmitter } from '../../lighting/mapObjectLights';

/**
 * Kanturu Relics (`WD_38KANTURU_2ND`, `World39`/`Object39`), the plain-data
 * half. Nothing here may import the scene.
 *
 * EncTerrain39.obj places 2014 objects of 70 types. **Object39 has holes**:
 * it ships 64 models, and types 21, 22, 25, 28, 39, 40, 42, 43, 51, 69 and
 * 84 have no `Object<n+1>.bmd` (37 records between them, mostly single
 * markers at the far east edge). Their loads fail and are logged; 42 is the
 * one with C++ behind it — a UV scroll that can never run — and 51 is in the
 * hidden list anyway.
 *
 * The C++ is GM_Kanturu_2nd.cpp: `Create_Kanturu2nd_Object` (:34-49),
 * `Move_Kanturu2nd_Object` (:212-272), `Render_Kanturu2nd_ObjectVisual`
 * (:329-525).
 */

/** No `o->BlendMesh` writes; the 10/38 sines and the 42 scroll are in `meshAnimation.ts`. */
export const KANTURU2_BLEND_MESHES: Readonly<Record<number, number>> = {};

/**
 * `Move_Kanturu2nd_Object` :246-268 hides 45-56 and 65. The render side
 * gives them (:388-525):
 *  - **45** (×1) `BITMAP_CLOUD` SubType 1, **46** (×0) SubType 2, **47**
 *    (×23) / **49** (×4) SubType 7 / 1 every tick, **48** (×60) SubType 10,
 *    **50** (×18) / **51** (×4) SubType 11 — the steam and mist banks.
 *  - **52** (×0) `WATERFALL_3` SubType 7, **53** (×34)
 *    `BITMAP_TWINTAIL_WATER` — the incubator spray.
 *  - **54** (×18): nothing; **55** (×32): `MODEL_FENRIR_THUNDER` effect
 *    model (not built); **56** (×13), **65** (×2): nothing.
 */
export const KANTURU2_EFFECT_ONLY_TYPES: readonly number[] = [
  45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 65,
];

/** The steam. `cloud21` for every cloud SubType; `waterfall5_9` for the spray. */
export const KANTURU2_EMISSIONS: Partial<Record<number, readonly Emission[]>> =
  {
    45: [{ kinds: ['cloud21'], every: 8 }],
    46: [{ kinds: ['cloud21'], every: 8 }],
    47: [{ kinds: ['cloud21'], every: 4 }],
    48: [{ kinds: ['cloud21'], every: 6 }],
    49: [{ kinds: ['cloud21'], every: 4 }],
    50: [{ kinds: ['cloud21'], every: 6 }],
    51: [{ kinds: ['cloud21'], every: 6 }],
    52: [{ kinds: ['waterfall5_9'], every: 2 }],
    53: [{ kinds: ['waterfall5_9'], every: 3, scale: 0.5 }],
  };

/**
 * `Render_Kanturu2nd_ObjectVisual`:
 *  - **4** (×21), :338-348: `BITMAP_LIGHT` + two `KANTURU_2ND_EFFECT1`
 *    sprites at bone 1, sized `fLumi / 3.2` — the relic lamps.
 *  - **8** (×18), :350-360: `BITMAP_ENERGY` particles and a `SPARK` sprite
 *    at bone 4 — the power conduits.
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
        sprite: { scale: 1.2, color: [0.5, 0.7, 1] },
      },
    ],
  };
