import type { Emission } from '../../common/effectParticles';
import { ENUM_WORLD } from '../../common/types';

/**
 * The login and character-select backdrops, the plain-data half. Nothing here
 * may import the scene.
 *
 * Four worlds, two art sets:
 *
 *  - `WD_73NEW_LOGIN_SCENE` draws `World74`/`Object74` - EncTerrain74.obj,
 *    375 objects of 52 types.
 *  - `WD_74NEW_CHARACTER_SCENE` draws `World75`/`Object75` - EncTerrain75.obj,
 *    112 objects of 22 types.
 *  - `WD_77NEW_LOGIN_SCENE` (`World78`, 628 objects) and
 *    `WD_78NEW_CHARACTER_SCENE` (`World79`, 96 objects) are the Season 6
 *    pair. They appear in the original exactly once, as the two enum names
 *    (MapManager.h:64-65); no `GM*` class, no registry and no render branch
 *    ever tests them, so the original gives their objects no behaviour at all.
 *
 * The two Season 4 worlds are the whole of the port. `GMNewTown::IsNewMap73_74`
 * (GMNewTown.cpp:44-47) routes every object hook for them straight into
 * `g_EmpireGuardian4` - `CreateObject` (:53-68), `MoveObject` (:92-93),
 * `RenderObjectVisual` (:239-243), `RenderObject` (:730-731) and
 * `RenderObjectAfterCharacter` (:818-822) - and `CMapManager::IsEmpireGuardian4`
 * (MapManager.cpp:1651) returns true for both, so every `GMEmpireGuardian4`
 * hook's own guard passes. The login scene *is* Fortress day 4, run on its
 * own two `EncTerrain` files.
 *
 * Two deltas from day 4, both in the source:
 *
 *  - `GMNewTown::CreateObject` :57-65 sets `HiddenMesh = -2` on 129, 79, 83,
 *    82, 85, 86, 130, 131 and 158 - but only inside
 *    `if (g_EmpireGuardian4.CreateObject(pObject))`, which returns true for
 *    10, 115, 117 and 129-132 alone. The two lists meet at 129/130/131, which
 *    `MoveObject` already hides every tick. The extra list is dead.
 *  - `GMEmpireGuardian4::RenderObjectVisual` case 157 (:1050-1053) returns
 *    before its body on these two worlds: the six chandeliers on World74 burn
 *    on the fortress and are cold here. See the note on
 *    `common/mapTileObject.ts` in the report - that file lights them.
 *
 * These tables hold only the types the two folders actually place. The rows
 * for the day-4 types neither folder has (80, 83, 84, 85, 130, 131) are left
 * out rather than carried at x0, because `effectOnly` and `emissions` are
 * per-*layer*: a row here also reaches `World78`/`World79`, whose art set is
 * unrelated and whose type 130 (x20 on World78) would go invisible for it.
 */

/**
 * `GMEmpireGuardian4::MoveObject` :212-226 hides 79, 80, 82-86 and 129-132;
 * these five are the ones EncTerrain74/75 place.
 *
 *  - **79** (x53 World74, x5 World75): the brazier (:917-938).
 *  - **82** (x1 World74): the fall (:951-955).
 *  - **86** (x2 World74): a warm fog bank (:991-998).
 *  - **129** (x15 World74, x4 World75): a cold one (:1001-1009).
 *  - **132** (x3 World75): the smoke column (:1034-1047). `Object75` has no
 *    `Object133.bmd` either, so this is the one type where the missing model
 *    and the hidden mesh agree - the original draws nothing and emits, which
 *    is what an `effectOnly` row already does.
 */
export const LOGIN_SCENE_EFFECT_ONLY_TYPES: readonly number[] = [
  79, 82, 86, 129, 132,
];

/**
 * The emitters, all from `GMEmpireGuardian4::RenderObjectVisual`.
 *
 * 79 spawns one particle per checked tick, picked by `rand() % 3` from
 * `FIRE_HIK1`, `FIRE_CURSEDLICH` and `FIRE_HIK3` (:926-937) - `kinds` is that
 * draw, so the count is the original's 1. This is the login screen's biggest
 * single cost: 53 braziers on the first frame a player ever sees.
 */
export const LOGIN_SCENE_EMISSIONS: Partial<
  Record<number, readonly Emission[]>
> = {
  79: [{ kinds: ['fire1', 'fire2', 'fire3'], every: 1, light: [1, 1, 1] }],

  82: [{ kinds: ['waterfall5_9'], every: 1 }],

  86: [{ kinds: ['cloud21'], every: 6, light: [0.05, 0.02, 0.01] }],

  129: [{ kinds: ['cloud21'], every: 6, light: [0.01, 0.02, 0.05] }],

  132: [
    { kinds: ['smoke60'], every: 3, count: 2 },
    { kinds: ['smoke21'], every: 3, scale: 2 },
  ],
};

/**
 * Types the `EncTerrain` file places whose `Object<n>` folder has no model.
 * `CMapManager::LoadWorld` (MapManager.cpp:1121-1123) registers `Object%d\`
 * for `WorldActive + 1` and then `AccessModel`s every id in the range, so a
 * missing file is simply never opened and the placement draws nothing. Here
 * it is a fetch that the dev server answers with index.html, so the types are
 * bound to a class that never asks.
 *
 * Computed from the folders, `Object<type + 1>.bmd`:
 *
 *  - `World74` places 1 (x2), 48 (x2), 75 (x1), 160 (x2), 162, 163, 164
 *    (x1 each); `Object74` is missing Object02, Object49, Object76 and stops
 *    at Object160.
 *  - `World75` places 11 (x1), 124 (x2), 126 (x4) and 132 (x3); `Object75`
 *    ships 18 models and has none of Object12, Object125, Object127,
 *    Object133. 132 is left out of this list - it is `effectOnly` above,
 *    which already skips the fetch.
 *  - `World78` and `World79` are complete: every id either folder places has
 *    its model.
 */
export const LOGIN_SCENE_ABSENT_MODELS: Partial<
  Record<ENUM_WORLD, readonly number[]>
> = {
  [ENUM_WORLD.WD_73NEW_LOGIN_SCENE]: [1, 48, 75, 160, 162, 163, 164],
  [ENUM_WORLD.WD_74NEW_CHARACTER_SCENE]: [11, 124, 126],
};

/**
 * `GMEmpireGuardian4::MoveObject` :160-236, as `o->Velocity` in BMD keys per
 * 25 Hz tick - the multipliers are over `CreateObject`'s default 0.16.
 *
 *  - **20** (x10 World74) `fSpeed *= 2` (:162-166).
 *  - **122**, **123**, **124** (x1 each, World74) `*= 3` (:168-174).
 *  - **128** (x13 World74) `*= 6` (:176-180).
 *  - **64** (x2 World75) `o->Velocity = 0.64f` (:207-211).
 */
export const LOGIN_SCENE_PLAY_SPEEDS: Partial<
  Record<ENUM_WORLD, Readonly<Record<number, number>>>
> = {
  [ENUM_WORLD.WD_73NEW_LOGIN_SCENE]: {
    20: 0.32,
    122: 0.48,
    123: 0.48,
    124: 0.48,
    128: 0.96,
  },
  [ENUM_WORLD.WD_74NEW_CHARACTER_SCENE]: { 64: 0.64 },
};
