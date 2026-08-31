import type { Emission } from '../../common/effectParticles';

/**
 * Blood Castle (worlds 11-17 + 52, all on `World12` / `Object12`), the
 * plain-data half. Nothing in here may import the scene: the shared registries
 * (`blendMeshes`, `effectOnlyObjects`, `effectParticles`) pull these tables
 * in, and every one of them is imported *by* `modelObject`/`mapTileObject`.
 *
 * EncTerrain12.obj: 210 objects, 35 types, the castle running north along
 * x ~ 5-20. Reading south to north: 0-4 the wall segments on the approach
 * (y 19-67), 14/15 the bridge girders under it (z 70-95; the bridge deck is
 * the walkable strip at x 14, y 16-21, with `TW_NOMOVE | TW_ACTION` rails at
 * x 13 and 15 — the edge `deathSystem` reads for the fall), 20/25/26/27 the
 * gatehouse walls (y 73-76), 16/17 the gate towers, 36 the gate at
 * (14.5, 76.1), 9/10 the broken-gate halves, 18/19 the throne room at y 91-98
 * with 12 the altar and 13 its four lamps; 21/22/23 the 43 hanging banners and
 * chains at scale 0.22-1, 30-33 statues and candles, 5/8 rubble.
 */

/**
 * `CreateObject` has no Blood Castle case (ZzzObject.cpp:4698-4770 falls to
 * the default, which is Chaos Castle / Hellas / Battle Castle). No blend
 * meshes; the additive pass this art set has is on `_R` textures
 * (`light_R`, `light2_R`, `pan_R`, `pant01_R`, `ju01_R`) and comes through
 * `textureScript.ts` on its own.
 */
export const BLOOD_CASTLE_BLEND_MESHES: Readonly<Record<number, number>> = {};

/**
 * `MoveObject` (ZzzObject.cpp:4135-4150) hides 9 and 10 unless `PKKey == 4`
 * — but they are *not* effect-only markers: they are the gate's two broken
 * halves, shown once the gate is down. `BloodCastleGateDebrisObject` owns
 * them, so the model loads and simply starts invisible.
 */
// Type 37: `Data/Object12` stops at Object37.bmd — there is no Object38.bmd for
// it, so the original loads nothing and only ever runs the `RenderObjectVisual`
// particles. The effect-only path skips the load and keeps the emissions.
export const BLOOD_CASTLE_EFFECT_ONLY_TYPES: readonly number[] = [37];

/**
 * Type 37 (x9), `RenderObjectVisual` ZzzObject.cpp:3187-3204: on alternate
 * quarter-ticks an `ADV_SMOKE` pair and a `CLOUD` + `ADV_SMOKE` + faint pink
 * `FLARE` — the smoke vents. Three sit *below* the ground (z -155 … 47) under
 * the bridge and the approach, the rest at floor level along the throne room
 * walls (z 215). `rand_fps_check(2)` on a `Timer % 4` is one puff of each
 * group every ~8 reference ticks, which is what `every: 8` on two rows gives.
 * `smoke2` is the shared big grey plume, `smoke0` the small one; the pink
 * flare is dropped (a 0.19-scale pink card in the plume reads as an artefact
 * without the additive blend the original draws it with).
 */
export const BLOOD_CASTLE_EMISSIONS: Partial<
  Record<number, readonly Emission[]>
> = {
  37: [
    { kinds: ['smoke2'], every: 8, jitter: 8 },
    { kinds: ['smoke0'], every: 8, jitter: 8 },
  ],
};

/** The gate, `Object12/Object37.glb` (type 36, x1 at 14.5, 76.1). */
export const BLOOD_CASTLE_GATE_TYPE = 36;

/** The two broken-gate halves the gate leaves behind (types 9 and 10). */
export const BLOOD_CASTLE_GATE_DEBRIS_TYPES: readonly number[] = [9, 10];

/** The candelabra (x11) with seven flames on bones 1,2,4,6,9,10,11. */
export const BLOOD_CASTLE_CANDELABRA_TYPE = 11;

/** The throne-room lamp (x4) with one breathing flare on bone 3. */
export const BLOOD_CASTLE_LAMP_TYPE = 13;

/**
 * `AddTerrainAttributeRange(13, 70, 3, 6, TW_NOGROUND, false)`
 * (ZzzObject.cpp:139): the pit the gate stands over, cleared when it falls.
 * EncTerrain12.att marks these 18 tiles `TW_NOGROUND | TW_ACTION` (0x28).
 */
export const BLOOD_CASTLE_GATE_PIT = { x: 13, y: 70, w: 3, h: 6 } as const;
