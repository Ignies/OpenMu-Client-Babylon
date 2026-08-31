import type { Emission } from '../../common/effectParticles';

/**
 * Santa Village (`WD_62SANTA_TOWN`, `World63`/`Object63`), the plain-data
 * half. Nothing here may import the scene.
 *
 * EncTerrain63.obj places 679 objects of 38 types; Object63 ships 44 models
 * and the one type-40 record (82.7/138.5) has none. The C++ is
 * GMSantaTown.cpp: `CreateObject` (:40-52), `MoveObject` (:75-99),
 * `RenderObjectVisual` (:142-179).
 */

/** No `o->BlendMesh` writes. */
export const SANTA_TOWN_BLEND_MESHES: Readonly<Record<number, number>> = {};

/** `MoveObject` :86-93 hides 26 (×42), 27 (×71), 28 (×56) — the snow-drift markers. */
export const SANTA_TOWN_EFFECT_ONLY_TYPES: readonly number[] = [26, 27, 28];

/** The markers draw nothing of their own in `RenderObjectVisual`. */
export const SANTA_TOWN_EMISSIONS: Partial<Record<number, readonly Emission[]>> =
  {};
