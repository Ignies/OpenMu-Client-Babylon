import type { Emission } from '../../common/effectParticles';

/**
 * Illusion Temple (`WD_45CURSEDTEMPLE_LV1 … LV6`, one `World47`/`Object47`
 * for all six levels — `assetWorldNum`), the plain-data half. Nothing here
 * may import the scene.
 *
 * EncTerrain47.obj places 1964 objects of 78 types; Object47 ships 83 models
 * and only type 81 (×3, no `Object82.bmd`) is missing. The C++ is
 * w_CursedTemple.cpp: `CreateObject` (:314, `return false`), `MoveObject`
 * (:321-364), `RenderObjectVisual` (:525-689).
 */

/**
 * No `o->BlendMesh` writes; the `BlendMeshLight = sin(t*0.001)*0.5+0.5` on
 * 64/65/80 (:337-341) is in `meshAnimation.ts`.
 */
export const CURSED_TEMPLE_BLEND_MESHES: Readonly<Record<number, number>> = {};

/**
 * `MoveObject` :342-353 hides 70-79 — the relic pedestals' markers that the
 * event's `RenderObjectVisual` draws its own effects on. Placed: 70 (×46), 71
 * (×23), 72 (×65), 73 (×5), 74 (×37), 75 (×21), 76 (×12), 77 (×20), 78 (×46),
 * 79 (×11).
 */
export const CURSED_TEMPLE_EFFECT_ONLY_TYPES: readonly number[] = [
  70, 71, 72, 73, 74, 75, 76, 77, 78, 79,
];

/**
 * Empty: what the markers show (:525-689) is the event's own state —
 * relic glow while a relic is held, the cursed statues' flames — none of
 * which exists outside a running Illusion Temple match.
 */
export const CURSED_TEMPLE_EMISSIONS: Partial<
  Record<number, readonly Emission[]>
> = {};
