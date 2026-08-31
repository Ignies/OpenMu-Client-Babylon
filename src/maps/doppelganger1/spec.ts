import type { Emission } from '../../common/effectParticles';

/**
 * Doppelganger 1 (`WD_65DOPPLEGANGER1`, `World66`/`Object66`), the plain-data
 * half. Nothing here may import the scene.
 *
 * EncTerrain66.obj places 421 objects of 33 types; Object66 ships 32 models,
 * and types 6 (×6) and 32 (×13) have none. The C++ is GMDoppelGanger1.cpp:
 * `CreateObject` (:45, empty), `MoveObject` (:170-193), `RenderObjectVisual`
 * (:400-474).
 */

/** No `o->BlendMesh` writes; the 22 sine (×0 placed) is in `meshAnimation.ts`. */
export const DOPPELGANGER1_BLEND_MESHES: Readonly<Record<number, number>> = {};

/** `MoveObject` :182-190 hides 70 (×0), 80 (×0), 99 (×30), 101 (×14). */
export const DOPPELGANGER1_EFFECT_ONLY_TYPES: readonly number[] = [
  70, 80, 99, 101,
];

/** The markers' effects (:400-474) are the event's state — empty. */
export const DOPPELGANGER1_EMISSIONS: Partial<
  Record<number, readonly Emission[]>
> = {};
