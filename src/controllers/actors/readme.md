# actors

The model objects for players, monsters and NPCs, and the rules for what they wear: body parts,
weapons on the hands and back, wings and capes, the guild flag, and which model a server object
type loads. Its door is `index.ts`; older readers still import some modules directly (baselined).

## Public API
- `PlayerObject` (the player rig with its part sockets; player-rig NPCs and monsters subclass it
  and set `NpcClass`, `NpcAlwaysFly`, `NpcHeroState`, `DeathShatter`), `isPlayerBody`, `npcClassOf`,
  `npcHeroStateOf` (a geared NPC's `pk`: net_helpers gives the entity that `heroState`, so the
  render system draws an outlaw's red body, ZzzCharacter.cpp:9988-9991);
  `MonsterObject`; `OperateBoxObject`, `LeanBoxObject` (invisible click targets for maps).
- `resolveModelFactory(type)`, `isKnownObjectType(type)` (`modelFactoryPerId.ts`): registered
  classes first, then the engine default the type's monster folder asks for.
- `registerModelClass(types, Class)` (`modelClasses.ts`): content's own model classes.
- `ModelObject` (forwarded from render, whose door exports it as a type only): the base of the
  plain-model NPC classes in content.
- Monster models from each monster's folder (through the monsters controller): `monsterModelFile`,
  `monsterModelTypeOfNpc`, `monsterScaleOf`, `monsterHiddenMesh`, `hasMonsterModel`;
  `monsterFactoryFor` (`genericMonster.ts`), the class every monster without its own uses.
- NPC defaults: `npcFactoryFor(file, scale?)`, `trapFactoryFor`, `HiddenNpc`,
  `npcSpawnScale(factory, type, world)` (`modelFactoryPerId.ts`); `gearedNpcFactory(gear)`,
  `transformedNpcFactory(dir, part, scale?)` (`playerNpc.ts`); `CHARACTER_DEFAULT_SCALE`
  (`monsterModelTable.ts`).
- NPC tables, live views of the monster folders kept for the readers that list them:
  `NPC_MODEL_TABLE`, `TRAP_MODEL_TABLE`, `npcModelFile` (`npcModelTable.ts`, with `folderTable`),
  `GEARED_NPC_TABLE`, `TRANSFORMED_NPC_TABLE` (`playerNpcTables.ts`).
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
  `modules/_shared/net_helpers.ts` and `modules/scope/net.ts`. It checks, in order: a
  registered class (`versions/shared/monsters/<name>/model.ts`), then the type's folder:
  `hidden` (`HiddenNpc`), `trap` (the map's world object), `model`
  (`Monster/Monster<modelType + 1>.glb`), `npcModel` (`NPC/<file>.glb`, or a path off the asset
  root when the file starts with `/`), `gear`, `transformed`, and falls back to monster model 0
  at scale 0.8. This folder imports no content: classes register themselves at boot.
- An NPC spawns at `npcSpawnScale`: its folder's `worldScale` on that world, else its class's
  `OverrideScale`, else 0.9, the `o->Scale` CreateCharacterPointer gives every character
  (ZzzCharacter.cpp:11699). A folder names a scale only when its CreateMonster case sets one;
  geared NPCs get SetCharacterScale's 0.9 on the CLASS_WIZARD rig.
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
  `monsters` (the folders' data), `core/types`, `ecs/world`. Baselined exceptions
  (`tools/checks/baselines/deps.json`): `modules/hero|pets|social|drops`, `app/store`.
- used by: `ecs/systems`, `modules/_shared/net_helpers.ts`, `modules/scope`,
  `modules/character_select`, `modules/drops`, `modules/gm/admin/skins.ts`, `app/store.ts`,
  `sound`, `item_fx/weaponBlur.ts`, `anim`, `assets/modelLoader.ts`, monster, npc, map and skill
  content in `versions/shared/`, `tools/assetCase.ts`.

## Change it
- a monster's model or scale: `model` in its folder (`versions/shared/monsters/<name>/index.ts`).
- a monster with its own behaviour: `<name>/model.ts` with a `MonsterObject` subclass and
  `registerModelClass(type, Class)`; nothing here changes.
- an NPC's model, kit, trap object or class: its monster folder
  (`versions/shared/monsters/<name>/`, see its readme); nothing here changes. A new kind of NPC
  shape: a factory here and a branch in `resolveModelFactory`.
- add a wing or cape: a constant and a `WINGS` / `CAPES` row in `wings.ts`; the model file comes
  from the item's `szModelFolder` / `szModelName` in its item file.
- change where a weapon sits: `weaponAttachment.ts`. How a drop lies: `itemAngle.ts`. An item's
  additive or hidden mesh: `RULES` in `itemObjectAttribute.ts`.

## Tests
- `approachPath.test.ts`: walk truncation at range, distance along the sent path, stall capping.
- `deserializeAppearance.test.ts`: `isAppearanceBlank` on empty and real previews.
- `itemAngle.test.ts`: drop scale and pose per group, worn height, the `ItemAngle` tail rows.
- `npcModelTable.test.ts`: every row names a file in `public/game-assets` and has a scale > 0; the
  tables behave as plain objects and read the folders when asked.
- `trapModels.test.ts`: every (map, trap) pair names an `Object<world+1>` model that exists.
- `resolveModel.golden.test.ts`: what every type 0..600 is drawn with (class, scale, base, kit,
  shared classes) and the NPC tables, as hashes; update them on purpose. It runs the real model
  classes under Node with the Store mocked.
- `npcLooks.test.ts`: NPCs drawn as the original builds them (Hanzo's scale, the 0.9 default and who sets its own, the plain-model NPCs,
  Zyro, the Cursed Wizard's kit, the plate helpers), each with its ZzzCharacter.cpp lines.
- `skinTexture.test.ts`: skin / hair / level and hide texture names.
- Also from `modules/items/`: `portedItems`, `questItemLink`, `weaponAttack` tests.

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
