import type { Emission } from '../../common/effectParticles';
import type { LightEmitter } from '../../lighting/mapObjectLights';

/**
 * Karutan 1 (`WD_80KARUTAN1`, `World81`/`Object81`) and Karutan 2
 * (`WD_81KARUTAN2`, `World82`/`Object82`), the plain-data half — one table
 * set: `CGMKarutan1::MoveObject` (GMKarutan1.cpp:42-65) tests
 * `IsKarutanMap()`, both worlds (:882-885), and `CreateObject` (:37-40) is
 * `return false`. `maps/karutan2` imports these.
 *
 * EncTerrain81.obj: 2086 objects, 103 types; EncTerrain82.obj: 1720 objects,
 * 83 types. Object81/82 ship 120/119 models; in World82, types 79 and 80
 * (one record each at 112/238) have none.
 */

/** No `o->BlendMesh` writes in the Karutan code. */
export const KARUTAN_BLEND_MESHES: Readonly<Record<number, number>> = {};

/**
 * `MoveObject` :48-63 hides 113, 114, 115, 116, 118; `RenderObjectVisual`
 * (:67-167):
 *  - **113** (K1 ×59 / K2 ×50): the fire vent — see `KARUTAN_LIGHTS`.
 *  - **114** (×15 / ×20): `WATERFALL_3` SubType 16 — the oasis spray.
 *  - **115** (×0 / ×26), **118** (×6 / ×9): `BITMAP_CLOUD` SubType 0 — the
 *    sand haze.
 *  - **116** (×65 / ×21): `BITMAP_SMOKE` SubType 69 and 13 at twice scale —
 *    the dust devils.
 */
export const KARUTAN_EFFECT_ONLY_TYPES: readonly number[] = [
  113, 114, 115, 116, 118,
];

export const KARUTAN_EMISSIONS: Partial<Record<number, readonly Emission[]>> = {
  114: [{ kinds: ['waterfall5_9'], every: 3 }],
  115: [{ kinds: ['cloud21'], every: 8, light: [0.6, 0.5, 0.35] }],
  116: [
    { kinds: ['smoke21'], every: 4, light: [0.7, 0.55, 0.35] },
    { kinds: ['smoke22'], every: 4, scale: 2, light: [0.7, 0.55, 0.35] },
  ],
  118: [{ kinds: ['cloud21'], every: 8, light: [0.6, 0.5, 0.35] }],
};

/**
 * `MoveObject` :48-54, type 113: `L = (rand%4+3)*0.1; AddTerrainLight(x, y,
 * (L, 0.6L, 0.2L), 3)` (the `case 113:` falls through into the hidden list)
 * + `RenderObjectVisual` :106-128: a `BITMAP_LIGHT` sprite at `2 * scale`
 * and the cycling `FIRE_HIK1` / `CURSEDLICH` / `HIK3`. Types 66 (×6 / ×0)
 * and 72 (×85 / ×113) carry bone sprites (`SHINY+5` at bones 13/14;
 * `LIGHT` + `SPARK` at bones 11/7, :74-105) — the Kardamahal lamps; sprites
 * only, one flare each.
 */
export const KARUTAN_LIGHTS: Partial<Record<number, readonly LightEmitter[]>> = {
  113: [
    {
      pointRange: 5,
      sprite: {
        scale: 2,
        color: [1, 0.6, 0.3],
        pulse: { speed: 3, amount: 0.2, base: 0.9 },
      },
      terrain: {
        range: 3,
        color: [1, 0.6, 0.2],
        flicker: { min: 0.3, max: 0.6, steps: 4 },
      },
      emissions: [{ kinds: ['fire1', 'fire3'], every: 2, jitter: 6 }],
    },
  ],
  66: [{ offset: [0, 0, 200], sprite: { scale: 1.2, color: [1, 0.8, 0.5] } }],
  72: [{ offset: [0, 0, 220], sprite: { scale: 1.5, color: [1, 0.8, 0.5] } }],
};
