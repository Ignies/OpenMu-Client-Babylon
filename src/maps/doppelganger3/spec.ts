import type { Emission } from '../../common/effectParticles';

/**
 * Doppelganger 3 (`WD_67DOPPLEGANGER3`, `World68`/`Object68`), the plain-data
 * half — Atlans' art under water. EncTerrain68.obj: 373 objects, 29 types;
 * Object68 ships 40 models, all present. The C++ is GMDoppelGanger3.cpp:
 * `CreateObject` (:40, empty), `MoveObject` (:60-101).
 */

/**
 * `MoveObject`: 23 (×2) `BlendMesh = 0`, 32 (×0) / 34 (×2) `BlendMesh = 1`,
 * 38 (×30) `BlendMesh = 0`, 40 (×0) `BlendMesh = 0` — the Atlans lamp, coral
 * and anemone table (ZzzObject.cpp:4010-4034) verbatim. The breathing sines
 * are in `meshAnimation.ts`.
 */
export const DOPPELGANGER3_BLEND_MESHES: Readonly<Record<number, number>> = {
  23: 0,
  32: 1,
  34: 1,
  38: 0,
  40: 0,
};

/**
 * 22 (×24): hidden, a 10-tick timer with `BITMAP_BUBBLE` for its second half
 * (:67-74) — the bubble vent, Atlans 20's twin; 47 (×0) / 48 (×2) hidden.
 */
export const DOPPELGANGER3_EFFECT_ONLY_TYPES: readonly number[] = [22, 47, 48];

/** No bubble kind in `effectParticles`; `smoke0` rising slowly stands in. */
export const DOPPELGANGER3_EMISSIONS: Partial<
  Record<number, readonly Emission[]>
> = {
  22: [{ kinds: ['smoke0'], every: 6, scale: 0.4 }],
};
