import type { Emission } from '@/controllers/fx/effectParticles';
import type { MeshAnimations } from '@/controllers/render';

/**
 * Doppelganger 3 (`WD_67DOPPLEGANGER3`, `World68`/`Object68`), the plain-data
 * half - Atlans' art under water. EncTerrain68.obj: 373 objects, 29 types;
 * Object68 ships 40 models, all present. The C++ is GMDoppelGanger3.cpp:
 * `CreateObject` (:40, empty), `MoveObject` (:60-101).
 */

/**
 * `MoveObject`: 23 (×2) `BlendMesh = 0`, 32 (×0) / 34 (×2) `BlendMesh = 1`,
 * 38 (×30) `BlendMesh = 0`, 40 (×0) `BlendMesh = 0` - the Atlans lamp, coral
 * and anemone table (ZzzObject.cpp:4010-4034) verbatim. The breathing sines
 * are in the `render.meshAnimations` rows.
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
 * (:67-74) - the bubble vent, Atlans 20's twin; 47 (×0) / 48 (×2) hidden.
 */
export const DOPPELGANGER3_EFFECT_ONLY_TYPES: readonly number[] = [22, 47, 48];

/**
 * No bubble kind in `effectParticles`; `smoke0` rising slowly stands in. 48 (×2), the sky-blue light
 * box, makes a `BITMAP_LIGHT` SubType 15 in `(0.6, 0.8, 1.0)` one tick in three (:340-351).
 */
export const DOPPELGANGER3_EMISSIONS: Partial<
  Record<number, readonly Emission[]>
> = {
  22: [{ kinds: ['smoke0'], every: 6, scale: 0.4 }],
  48: [{ kinds: ['light15'], every: 3, light: [0.6, 0.8, 1] }],
};

/** Doppelganger 3 (GMDoppelGanger3.cpp:75-93): the Atlans sines verbatim. */
export const DOPPELGANGER3_MESH_ANIMATIONS: MeshAnimations = {
  23: { mesh: 0, kind: 'blend', light: t => Math.sin(t * 0.002) * 0.3 + 0.5 },
  32: { mesh: 1, kind: 'blend', light: t => Math.sin(t * 0.004) * 0.5 + 0.5 },
  34: { mesh: 1, kind: 'blend', light: t => Math.sin(t * 0.004) * 0.5 + 0.5 },
  40: { mesh: 0, kind: 'blend', light: t => Math.sin(t * 0.004) * 0.3 + 0.5 },
};
