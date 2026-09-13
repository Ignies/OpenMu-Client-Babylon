/**
 * Devias (`WD_2DEVIAS`, `World3`/`Object3`), the plain-data half. Devias has
 * no effect-only types and no emitters of its own (the candelabra and hearths
 * are object classes bound in `create.ts`); only the blend meshes.
 */

/**
 * CreateObject, ZzzObject.cpp:4643-4651 (World 3 / Object3).
 *
 * 19 is the aurora curtain that hangs over the ravines - 136 of them on the
 * map, five tiles up. The original puts it in the same `BlendMesh = 0` case
 * as 92 and 93 (:4646) and this table had dropped it, so it was drawn as an
 * ordinary surface: no light of its own, and hazed as if it were the ground
 * behind it rather than the glow in front of it.
 */
export const DEVIAS_BLEND_MESHES: Readonly<Record<number, number>> = {
  19: 0,
  92: 0,
  93: 0,
  54: 1,
  56: 1,
  78: 3,
};
