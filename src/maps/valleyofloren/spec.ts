import type { Emission } from '../../common/effectParticles';

/**
 * Valley of Loren (`WD_30BATTLECASTLE`, `World31`/`Object31`), the plain-data
 * half. Nothing here may import the scene.
 *
 * EncTerrain31.obj places 3724 objects of 86 types; Object31 ships 89 models
 * and every referenced type has one. The C++ is GMBattleCastle.cpp —
 * `CreateBattleCastleObject` (:986-1049), `MoveBattleCastleObject` (:926-984)
 * and `MoveBattleCastleVisual` (:1051+) — and almost all of it is the *siege*:
 * wall segments (`BATTLE_CASTLE_WALL1-4`) that switch between whole and
 * ruined on `o->ExtState` from the server, guard stones, the gate plane
 * effect, `SetAttackDefenseObjectType`. None of that runs outside a Castle
 * Siege, and the clone has no siege state, so the peacetime map is what is
 * staged.
 */

/**
 * `MoveBattleCastleObject` (:930-940): 81 and 83 both force `o->BlendMesh = 1`
 * with a full `BlendMeshLight` and a V scroll (`+0.0002`/ms on 81,
 * `-0.0004`/ms on 83) — the two banner/energy sheets on the castle. The
 * scrolls are in `meshAnimation.ts`. EncTerrain31.obj places one 81 and no
 * 83; the table matches the source rather than the map.
 */
export const VALLEY_OF_LOREN_BLEND_MESHES: Readonly<Record<number, number>> = {
  81: 1,
  83: 1,
};

/**
 * `CreateBattleCastleObject` case 39 (`HiddenMesh = -2`, one record at
 * 87.5/120.9) and `MoveBattleCastleVisual` 42/52/54 (hidden every frame).
 * `MODEL_BATTLE_GUARD2` is hidden only while the siege runs, so it stays
 * visible here. None of the four carries an effect in the C++.
 */
export const VALLEY_OF_LOREN_EFFECT_ONLY_TYPES: readonly number[] = [
  39, 42, 52, 54,
];

/** No particle emitters outside the siege; `CreateFireSnuff` is the leaves slot. */
export const VALLEY_OF_LOREN_EMISSIONS: Partial<
  Record<number, readonly Emission[]>
> = {};
