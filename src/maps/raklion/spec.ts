import type { Emission } from '../../common/effectParticles';

/**
 * Raklion (`WD_57ICECITY`, `World58`/`Object58`) and its hatchery
 * (`WD_58ICECITY_BOSS`, `World59`/`Object59`), the plain-data half — one
 * table set, because `CGM_Raklion::MoveObject` (GM_Raklion.cpp:244-269)
 * tests `IsIceCity()`, which is both worlds (:2235-2242). `maps/raklionboss`
 * imports these.
 *
 * EncTerrain58.obj: 1474 objects, 70 types; EncTerrain59.obj: 162 objects,
 * 23 types. Object58 ships 83 models, all present; Object59 ships 21 and
 * type 83 (×6 at 172.5/24.5) has none.
 */

/**
 * No `o->BlendMesh` writes; the `BlendMeshLight = sin(t*0.001)+1` on 22
 * (:250-254, ×15 / ×0) is in `meshAnimation.ts`.
 */
export const RAKLION_BLEND_MESHES: Readonly<Record<number, number>> = {};

/**
 * `MoveObject` :255-260 hides 70 (×0 / ×6) and 80 (×4 / ×0);
 * `RenderObjectVisual` (:1686-1737) gives both a cycling
 * `BITMAP_FIRE_HIK1/2/3_MONO` — the ice-blue flames on the cave braziers.
 */
export const RAKLION_EFFECT_ONLY_TYPES: readonly number[] = [70, 80];

/** `fire157` is `firehik_mono03`, the same mono sheet. */
export const RAKLION_EMISSIONS: Partial<Record<number, readonly Emission[]>> = {
  70: [{ kinds: ['fire157'], every: 2, light: [0.6, 0.8, 1] }],
  80: [{ kinds: ['fire157'], every: 2, light: [0.6, 0.8, 1] }],
};
