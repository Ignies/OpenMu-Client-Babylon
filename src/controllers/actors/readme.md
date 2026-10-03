# actors

The model objects for players, monsters and NPCs, and the rules for what they wear: body parts,
weapons on the hands and back, wings and capes, the guild flag, and which model a server object
type loads. There is no `index.ts`; other folders import the modules below directly.

## Public API
- `PlayerObject` (the player rig with its part sockets; player-rig NPCs and monsters subclass it
  and set `NpcClass`, `NpcAlwaysFly`, `DeathShatter`), `isPlayerBody`, `npcClassOf`;
  `MonsterObject`; `OperateBoxObject`, `LeanBoxObject` (invisible click targets for maps).
- `resolveModelFactory(type)`, `isKnownObjectType(type)`; the tables `MONSTER_MODEL_TABLE`,
  `monsterModelFile`, `monsterScaleOf`, `MONSTER_HIDDEN_MESH`, `NPC_MODEL_TABLE`, `npcModelFile`,
  `GEARED_NPC_TABLE`, `TRANSFORMED_NPC_TABLE`.
- `transformedBody.ts`: `transformedBodyFactory`, `characterSkinBody(skin)`, `monsterClipFor`.
- `deserializeAppearance.ts`: `deserializeAppearance`, `deserializeAppearanceExtended`,
  `APPEARANCE_EXTENDED_LENGTH`, `classFromAppearance`, `emptyAppearance`, `withAppearanceClass`,
  `isAppearanceBlank`, `itemLevelFromGlow`.
- `weaponClass.ts`: `GROUP_*`, item tests (`isWeaponItem`, `isBow`, `isCrossbow`, `isBook`,
  `equippedBowType`, `swordformGlovesModel`), clip pickers (`chooseIdleAction`, `chooseWalkAction`,
  `chooseRunAction`, `chooseFenrir*Action`, `chooseAttackAction`, `chooseHighBowAttackAction`,
  `isSocialAction`), types `CharacterPose`, `AttackPose`, `Hands`.
- `weaponAttachment.ts`: `RIGHT_HAND_BONE`, `LEFT_HAND_BONE`, `BACK_BONE`,
  `applyWeaponAttachments`, `applyWeaponPoses`, `questItemLink`, `PHOENIX_POSE`.
- `wings.ts`: `wingSpec`, `isWingItem`, `wingBone`, `isFastWing`, `WING_GROUP`, `HELPER_GROUP`,
  `WING_BONE`, `CAPE_BONE`, wing index constants (`WING_OF_ELF`, `CAPE_OF_LORD`, ...).
- `locomotion.ts`: `RUN_THRESHOLD`, `FENRIR_RUN_DELAY`, `RUN_UNITS_PER_SECOND`, `canAccumulateRun`,
  `forcesRun`, `characterMoveSpeed`, `isSwimWorld`, `inChaosCastle`, `inDevilSquare`,
  `inBloodCastle`, `inHellas`.
- Small helpers: `MapPlayerNetClassToModelClass`, `isFemaleClass`; `classWorldScale`;
  `truncatePathWithinRange`, `distanceAlongPath`; `debuffBodyLight`, `debuffBrightBody`,
  `debuffSlow`; `ItemGroup`, `ItemRestPose`, `itemRestHeight`, `itemWornHeight`, `itemTumbleAxis`;
  `itemObjectAttribute(group, num)`; `GuildFlag`, `GUILD_FLAG_BONE`, `isThunderHawkArmor`;
  `applyOutlawLook`, `outlawUltraActive`, `OUTLAW_ULTRA_LIGHT`; `isSkinOrHairTexture`,
  `isHideTexture`; `traceHeroInstantMove`.

## How it works
- A spawned object's class comes from `resolveModelFactory(type)`, called by
  `features/_shared/net_helpers.ts` and `features/scope/net.ts`. It checks, in order:
  `ModelFactoryPerId` (a content class), `TRAP_MODEL_TABLE`, `MONSTER_MODEL_TABLE`
  (`Monster/Monster<modelType + 1>.glb`), `NPC_MODEL_TABLE` (`NPC/<file>.glb`, or a path off the
  asset root when the file starts with `/`), `GEARED_NPC_TABLE`, `TRANSFORMED_NPC_TABLE`, and
  falls back to monster model 0 at scale 0.8.
- `PlayerObject` loads `Player/player.glb` (a rig with no meshes) and hangs every part on it as a
  child `ModelObject`: helm, mask, armor, pants, gloves, boots, two weapons, two Phoenix wings,
  wings, quest item and pet. Weapons link to bones 33 / 42 (ZzzCharacter.cpp:11849-11850), wings
  and the quest item to 47, capes with a link matrix to 19. `ecs/systems/appearanceSystem.ts`
  fills the sockets; `animationSystem.ts` picks clips with `weaponClass.ts` / `locomotion.ts` and
  calls `applyWeaponPoses` every frame.
- `WingObject` (`wingObject.ts`) draws the extras a `WingSpec` in `wings.ts` declares: the
  additive membrane mesh, bone sprites, thunder and mesh passes (ZzzObject.cpp:9860-9925).
- `MonsterObject` applies the blend mesh from `monsterBlendMesh.ts` on load and the Budge Dragon
  hover while walking (ZzzCharacter.cpp:6274-6278).
- A transformation skin (`characterSkinBody`) is either a part file worn on the player rig in place
  of the armor (`transformedBodyFactory`, ZzzCharacter.cpp:9345-9440) or a whole monster model that
  plays monster clips (`monsterClipFor`, WSclient.cpp:2760-2800).

## Depends on / used by
- uses: `render` (`ModelObject`, bone links), `assets`, `anim`, `fx`, `item_fx`, `lighting`,
  `core/types`, `ecs/world`. Baselined exceptions (`tools/checks/baselines/deps.json`):
  `features/hero|pets|social|drops`, `app/store`, and `modelFactoryPerId.ts` /
  `playerNpcTables.ts` importing `versions/shared/monsters` and `versions/shared/npcs`.
- used by: `ecs/systems`, `features/_shared/net_helpers.ts`, `features/scope`,
  `features/character_select`, `features/drops`, `features/gm/admin/skins.ts`, `app/store.ts`,
  `sound`, `item_fx/weaponBlur.ts`, `anim`, `assets/modelLoader.ts`, monster, npc, map and skill
  content in `versions/shared/`, `tools/assetCase.ts`.

## Change it
- add a monster that only needs a model: add `type: [modelType, scale]` to `MONSTER_MODEL_TABLE`.
- add a monster with its own behaviour: a class extending `MonsterObject` in
  `versions/shared/monsters/<name>.ts`, then a `[type]: Class` row in `ModelFactoryPerId`.
- add an NPC model: a `type: [file, scale]` row in `NPC_MODEL_TABLE` (relative to `Data/NPC/`);
  the test checks the file exists. A player-rig NPC goes in `GEARED_NPC_TABLE` or
  `TRANSFORMED_NPC_TABLE`.
- add a wing or cape: a constant and a `WINGS` / `CAPES` row in `wings.ts`; the model file comes
  from the item's `szModelFolder` / `szModelName` in its item file.
- change where a weapon sits: `weaponAttachment.ts`. How a drop lies: `itemAngle.ts`. An item's
  additive or hidden mesh: `RULES` in `itemObjectAttribute.ts`.

## Tests
- `approachPath.test.ts`: walk truncation at range, distance along the sent path, stall capping.
- `deserializeAppearance.test.ts`: `isAppearanceBlank` on empty and real previews.
- `itemAngle.test.ts`: drop scale and pose per group, worn height, the `ItemAngle` tail rows.
- `npcModelTable.test.ts`: every row names a file in `public/game-assets` and has a scale > 0.
- `skinTexture.test.ts`: skin / hair / level and hide texture names.
- Also from `features/items/`: `portedItems`, `questItemLink`, `weaponAttack` tests.

## Notes

### deserializeAppearance.ts
The 18-byte preview carries everything a remote player's gear can show: level glow, excellent and
ancient passes, wings and the pet. Reading only the item numbers is what once left other players'
effects and wings off. Hands carry no excellent or ancient bit in this layout.

### heroMoveTrace.ts
`ObjectMoved` (C1 15) is the only packet that moves the hero without a walk: a gate, a teleport, an
`InstantMoveRequest`, or a resync when the server thinks the client drifted. These look the same
from outside, so each jump of 1.5 tiles or more logs what the client believed: its position, the
last walk sent (`sentWalk`) and the approach in progress. A `sentWalk` ending where the server put
the hero is a walk the client failed to stop; no walk at all means the server moved him itself.

### monsterBlendMesh.ts
Keyed by monster model type. `MonsterObject.load` sets `BlendMesh` / `BlendMeshLight` unless the
class set its own, and binds the per-tick writes with `bindMeshAnimation`. Crust, Balrog and Devil
are left out on purpose: their `BlendMeshTexCoord` writes (ZzzCharacter.cpp:5818, :6012, :6015) land
on `BlendMesh = -1` and draw nothing (ZzzBMD.cpp:1847).

### weaponAttachment.ts
In the hands the weapon frame is the hand bone, no matrix (Link=false, ZzzCharacter.cpp:9961). On
the back (bone 47) a BMD bone-space matrix `AngleMatrix(70,0,90)` plus a per-type offset is used,
and left-hand items get an extra `AngleMatrix(145,0,275)+(0,10,-30)` concatenated in place. The
3x4 maths ports ZzzMathLib.cpp literally, including `R_ConcatTransforms` writing over its own input
(see `render/boneLink.ts`): the result is sheared, but it is what the original renders. The
`?backRot=` and `?backOff=` URL queries override the back matrix; they are not gated to dev builds.

### wings.ts
`MODEL_WING + n` is `{ group: 12, num: n }`; capes are group 13. Not ported because the original
never reads them: the Wings of Soul / Dragon `BlendMeshLight` sines (ZzzObject.cpp:9816-9822) and
the Wings of Spirits `Scale = 0.5` (:5277), both written to the shared `g_ItemObject[Type]`.
