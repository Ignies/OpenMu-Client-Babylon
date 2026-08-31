/**
 * Devias (`WD_2DEVIAS`, `World3`/`Object3`), the plain-data half. Devias has
 * no effect-only types and no emitters of its own (the candelabra and hearths
 * are object classes bound in `create.ts`); only the blend meshes.
 */

/** CreateObject, ZzzObject.cpp:4643-4651 (World 3 / Object3). */
export const DEVIAS_BLEND_MESHES: Readonly<Record<number, number>> = {
  92: 0,
  93: 0,
  54: 1,
  56: 1,
  78: 3,
};
