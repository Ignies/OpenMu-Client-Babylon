import type { Emission } from '../../common/effectParticles';
import type { LightEmitter } from '../../lighting/mapObjectLights';

/**
 * Vulcanus / the PK Field (`WD_63PK_FIELD`, `World64`/`Object64`), the
 * plain-data half. Nothing here may import the scene.
 *
 * EncTerrain64.obj places 2290 objects of 62 types — 993 of them type 17,
 * the lava-rock scatter. Object64 ships 61 models; the one type-54 record
 * (224.5/163.5) has none. The C++ is GM_PK_Field.cpp: `CreateObject`
 * (:230-243), `MoveObject` (:245-269), `RenderObjectVisual` (:271-389).
 *
 * `CGMDoppelGanger2` (GMDoppelGanger2.cpp:41-86) is the same code on the same
 * art (Object67 = Object64's set) with two extra hidden types; it has its own
 * spec that imports from here.
 */

/** No `o->BlendMesh` writes. */
export const VULCANUS_BLEND_MESHES: Readonly<Record<number, number>> = {};

/**
 * `MoveObject` :252-262 hides 0-6, which `RenderObjectVisual` draws as:
 *  - **0** (×10): `WATERFALL_2` SubType 6 — lava spray, one in eight.
 *  - **1** (×49): `BITMAP_SMOKE` SubType 60.
 *  - **2** (×0): `BITMAP_CLOUD` SubType 16; **3** (×102): SubType 11 — the
 *    heat haze.
 *  - **4** (×0): `BITMAP_SPARK` SubType 9 thrown at a random angle.
 *  - **5** (×5): `BITMAP_SMOKE` SubType 21.
 *  - **6** (×50): the lava vent — see `VULCANUS_LIGHTS`.
 */
export const VULCANUS_EFFECT_ONLY_TYPES: readonly number[] = [
  0, 1, 2, 3, 4, 5, 6,
];

/** The vents. `ember` is the closest to a thrown spark. */
export const VULCANUS_EMISSIONS: Partial<Record<number, readonly Emission[]>> =
  {
    0: [{ kinds: ['waterfall5_9'], every: 8, light: [1, 0.4, 0.1] }],
    1: [{ kinds: ['smoke21'], every: 3 }],
    2: [{ kinds: ['cloud21'], every: 6, light: [0.5, 0.3, 0.2] }],
    3: [{ kinds: ['cloud21'], every: 8, light: [0.5, 0.3, 0.2] }],
    4: [{ kinds: ['ember'], every: 3, light: [1, 0.5, 0.1] }],
    5: [{ kinds: ['smoke21'], every: 4 }],
  };

/**
 * Type 6 (×50), `RenderObjectVisual` :363-386: a `BITMAP_LIGHT` sprite sized
 * `2 * scale` in a fire colour, plus a `FIRE_HIK1` / `FIRE_CURSEDLICH` /
 * `FIRE_HIK3` particle cycling on `(int)WorldTime % 3`. No `AddTerrainLight`
 * in the PK Field code at all — the lava glow is the baked lightmap — so the
 * terrain light here is ours, kept small (range 2) so it only lifts the rim
 * of the vent.
 */
export const VULCANUS_LIGHTS: Partial<Record<number, readonly LightEmitter[]>> =
  {
    6: [
      {
        pointRange: 4,
        sprite: {
          scale: 2,
          color: [1, 0.5, 0.2],
          pulse: { speed: 3, amount: 0.2, base: 0.9 },
        },
        terrain: {
          range: 2,
          color: [1, 0.45, 0.15],
          flicker: { min: 0.5, max: 1, steps: 4 },
        },
        emissions: [{ kinds: ['fire1', 'fire3'], every: 2, jitter: 6 }],
      },
    ],
  };
