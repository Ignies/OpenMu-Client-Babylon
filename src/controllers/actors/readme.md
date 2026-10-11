# actors

The model objects for players, monsters and NPCs, and the rules for what they wear: body parts,
weapons on the hands and back, wings and capes, the guild flag, and which model a server object
type loads. Its door is `index.ts`; older readers still import some modules directly (baselined).

## Public API
- `PlayerObject` (the player rig with its part sockets; player-rig NPCs and monsters subclass it
  and set `NpcClass`, `NpcAlwaysFly`, `NpcHeroState`, `DeathShatter`), `isPlayerBody`, `npcClassOf`,
  `npcHeroStateOf` (a geared NPC's `pk`: `modules/scope/objects.ts` gives the entity that `heroState`, so the
  render system draws an outlaw's red body, ZzzCharacter.cpp:9988-9991);
  `MonsterObject`; `OperateBoxObject`, `LeanBoxObject` (invisible click targets for maps; `Drawn` keeps the model on screen).
- `resolveModelFactory(type)`, `isKnownObjectType(type)` (`modelFactoryPerId.ts`): registered
  classes first, then the engine default the type's monster folder asks for.
- `registerModelClass(types, Class)` (`modelClasses.ts`): content's own model classes.
- `ModelObject` (forwarded from render): the base of the
  plain-model NPC classes in content.
- Monster models from each monster's folder (through the monsters controller): `monsterModelFile`,
  `monsterModelTypeOfNpc`, `monsterScaleOf`, `monsterHiddenMesh`, `hasMonsterModel`;
  `monsterFactoryFor` (`genericMonster.ts`), the class every monster without its own uses.
- NPC defaults: `npcFactoryFor(file, scale?, clipSpeeds?, holdFrame?)`, `trapFactoryFor`, `HiddenNpc`,
  `npcSpawnScale(factory, type, world)` (`modelFactoryPerId.ts`), `MapActors` (`mapActors.ts`, the
  map's `actors` row); `gearedNpcFactory(gear)`,
  `transformedNpcFactory(dir, part, scale?)` (`playerNpc.ts`); `CHARACTER_DEFAULT_SCALE`
  (`monsterModelTable.ts`).
- NPC tables, live views of the monster folders kept for the readers that list them:
  `NPC_MODEL_TABLE`, `TRAP_MODEL_TABLE`, `npcModelFile` (`npcModelTable.ts`, with `folderTable`),
  `GEARED_NPC_TABLE`, `TRANSFORMED_NPC_TABLE` (`playerNpcTables.ts`).
- `transformedBody.ts`: `transformedBodyFactory`, `characterSkinParts`, `monsterClipFor`.
  `skinBody.ts`: `characterSkinBody(skin)` (its own file: it resolves monster models).
- `deserializeAppearance.ts`: `deserializeAppearance`, `deserializeAppearanceExtended`,
  `APPEARANCE_EXTENDED_LENGTH`, `classFromAppearance`, `emptyAppearance`, `withAppearanceClass`,
  `isAppearanceBlank`, `itemLevelFromGlow`.
- `weaponClass.ts`: `GROUP_*`, item tests (`isWeaponItem`, `isTwoHanded`, `isBow`, `isCrossbow`, `isBook`,
  `equippedBowType`, `swordformGlovesModel`), clip pickers (`chooseIdleAction`, `chooseWalkAction`,
  `chooseRunAction`, `chooseFenrir*Action`, `chooseAttackAction`, `chooseHighBowAttackAction`,
  `isSocialAction`), types `CharacterPose`, `AttackPose`, `Hands`.
- `weaponAttachment.ts`: `RIGHT_HAND_BONE`, `LEFT_HAND_BONE`, `BACK_BONE`,
  `applyWeaponAttachments`, `applyWeaponPoses`, `questItemLink`, `PHOENIX_POSE`.
- `chaosCastleUnit.ts` (on the door): `heldWeapons(e, map)` (`c->Weapon`: what a character is drawn,
  posed, swung and lit holding), `shownGear(e, map)` (the gear its item glow comes off),
  `wearsChaosCastleSkin(e, map)`, type `Gear`. Inside Chaos Castle every player holds the castle's
  weapons, all +0 (`ChangeChaosCastleUnit`, CSChaosCastle.cpp:130-170); range and ammo stay its own.
- `PlayerObject.Cloth`, `MonsterObject.Cloth`: the body's physics cloths (`o->m_pCloth`, a `controllers/cloth` `ClothSet`).
  `cloaks.ts`: `registerCloaks(rule)` (the wearers' content hands its rule in at boot), `cloaksFor(wearer, set)`
  (the rule builds, destroys and draws on the body's set as `RenderCharacter` does), types `CloakWearer`,
  `CloakSet`, `CloakRule`; `ecs/systems/clothSystem.ts` asks it every frame.
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
  `isHideTexture`, `hideSkinTexture(group, num)` and `hideSkinMeshes(group, num)` (on the door: the
  bitmap a dropped part draws mesh 0 with, and the only meshes it draws, `RenderPartObjectBody`'s
  HideSkin branches, ZzzObject.cpp:7614-8908); `traceHeroInstantMove`.
- `openHelm.ts`: `showsClassHead(helm)`, whether the class head is drawn under that helm (below).
- `classPartModel.ts`: `classPartModel(part, charClass)`, the `Player/` model a class wears for an armour piece in
  place of the item's own: the Summoner's Vine and Silk pieces (`HelmElfC`...), the Rage Fighter's Leather, Scale,
  Brass and Plate (`HelmMonk`..., gloves and boots both `BootMonk`, MonkSystem.cpp:187-206) and the Dark Lord's
  Bronze, Leather, Scale, Brass and Plate helms (`MaskHelmMale`), ZzzCharacter.cpp:9579-9617.
- `itemModel.ts`: `dressItemModel(object, group, num)`, what the original does to every loose item
  model, on the ground or in the bag (`ItemHeight`, `HideSkin`, frozen at frame 0, the
  `ItemObjectAttribute` mesh rules; `DropObject` and the bag icon both use it), and
  `loadItemModel(scene, parent, group, num, file)`, such a model with no entity behind it. A worn
  `Player/` part keeps its own file's skeleton, posed at its first frame, as a drop does.
- `itemIcon.ts`: `itemIconJob(scene, item)`, the shot of a bag icon drawn from the item's model, and
  `liveItemIconSource(scene)` / `liveItemSpinSource(scene)`, what the app puts in the interface's
  live-icon and spin slots;
  `ITEM_ICON_UNITS_PER_PIXEL`.

## How it works
- A spawned object's class comes from `resolveModelFactory(type)`, called by
  `modules/scope/objects.ts` and `modules/scope/net.ts`. It checks, in order: a
  registered class (`versions/shared/monsters/<name>/model.ts`), then the type's folder:
  `hidden` (`HiddenNpc`), `trap` (the map's world object), `model`
  (`Monster/Monster<modelType + 1>.glb`), `npcModel` (`NPC/<file>.glb`, or a path off the asset
  root when the file starts with `/`), `gear`, `transformed`, and falls back to monster model 0
  at scale 0.8. This folder imports no content: classes register themselves at boot.
- An NPC spawns at `npcSpawnScale`: its folder's `worldScale` on that world, else its class's
  `OverrideScale`, else 0.9, the `o->Scale` CreateCharacterPointer gives every character
  (ZzzCharacter.cpp:11699). A folder names a scale only when its CreateMonster case sets one;
  geared NPCs get SetCharacterScale's 0.9 on the CLASS_WIZARD rig. The map then adds its
  `actors.monsterScale` row (`MapActors`, `mapActors.ts`): Blood Castle's skeleton line, 84-143,
  grows 0.05 a third of the castle (Setting_Monster, ZzzCharacter.cpp:13150-13159).
- `PlayerObject` loads `Player/player.glb` (a rig with no meshes) and hangs every part on it as a
  child `ModelObject`: helm, mask, armor, pants, gloves, boots, two weapons, two Phoenix wings,
  wings, quest item and pet. Weapons link to bones 33 / 42 (ZzzCharacter.cpp:11849-11850), wings
  and the quest item to 47, capes with a link matrix to 19. A Rage Fighter glove weapon is the
  exception: its worn model is skinned to the rig like an armour piece and linked to no bone, in the
  hands and in town (`RenderSwordformGloves`, MonkSystem.cpp:248-252). `ecs/systems/appearanceSystem.ts`
  fills the sockets and gives a held weapon its `ItemObjectAttribute` mesh rules (ZzzCharacter.cpp:6648);
  `animationSystem.ts` picks clips with `weaponClass.ts` / `locomotion.ts` and
  calls `applyWeaponPoses` every frame.
- `GmMark` is the Webzen mark (`PARTS_WEBZEN`, `Skill/musign.glb`, CSParts.cpp:28-46) a game master
  wears: `setGmMarkAsync(on)` (driven by `ecs/systems/gmMark.ts` from `AppearanceSystem`: the GM buff 28 or the hero's
  operator status, never while cloaked). It is its own root, not a child, so it keeps its own orange
  chrome pass (ZzzObject.cpp:1558-1564); each frame it is put at head bone 20 plus (70, -5, 0) cm and
  turned with the body, not the bone (`CSParts::IRender`).
- The `Helm` socket is the class head and `HelmMask` the worn helm. The head is drawn bare-headed (it is then
  BODYPART_HELM) and under the open helms, Bronze, Pad, Vine to Spirit and 63, 65, 68, 70 (BODYPART_HEAD); any
  other helm hides it (`showsClassHead`, SetCharacterScale, ZzzCharacter.cpp:12114-12128). Every player is dressed
  by `appearanceSystem.ts`, the character select line-up too (ReadEquipmentExtended calls the same rule); the
  create screen draws the whole `Logo/NewFace` model (MODEL_FACE, CharMakeWin.cpp:467), no parts.
- `WingObject` (`wingObject.ts`) draws the extras a `WingSpec` in `wings.ts` declares: the
  additive membrane mesh, bone sprites, thunder and mesh passes (ZzzObject.cpp:9860-9925). They
  run while any of the model's meshes is drawn, nested ones included: an unskinned GLB (the Dark
  Lord robe, Wing50) hangs its meshes under its `model_<name>` node, not the root.
- `MonsterObject` applies the blend mesh from `monsterBlendMesh.ts` on load and the Budge Dragon
  hover while walking (ZzzCharacter.cpp:6274-6278).
- A transformation skin (`characterSkinBody`) is either a part file worn on the player rig in place
  of the armor (`transformedBodyFactory`, ZzzCharacter.cpp:9345-9440) or a whole monster model that
  plays monster clips (`monsterClipFor`, WSclient.cpp:2760-2800).
- A bag icon the pack has no file for (`itemIcon.ts`) is drawn as `RenderItem3D` draws every icon
  (ZzzInventory.cpp:9707): the original's item camera has an identity view, a 1 degree field over
  the 640 x 480 screen and puts the item 200 units out (0.1 of `RENDER_ITEMVIEW_FAR`), so a bag pixel
  is `ITEM_ICON_UNITS_PER_PIXEL` units there. The shot covers the item's squares (20 pixels each),
  places the model at its anchor in them plus its offset, turns it and sets its body height as
  `RenderObjectScreen` does (`interface/item_icons/itemIconPose.ts`, two-handed by `isTwoHanded`, the
  item's own `TwoHand`) and scales it by `itemIconScale.ts`; its meshes carry the item's
  `itemVisualTier` as worn gear does (the level and excellent passes, RenderPartObject at the item's
  level and options, ZzzInventory.cpp:9699); `render/iconShot.ts` draws it once. The item under the
  cursor (nothing held) turns: `Angle[1] = WorldTime * 0.45f` (ZzzInventory.cpp:8856-8859), its other
  angles kept, drawn every frame by the shot's spin onto the icon's canvas, pack icons too. A picture is kept
  per look (group, number, level, excellent, ancient) until the item-effects option (or the effect
  limit) changes: `liveItemIconSource` then forgets the shots and the interface's pictures, and every
  look is drawn again.

## Depends on / used by
- uses: `render` (`ModelObject`, bone links), `assets`, `anim`, `fx`, `item_fx`, `lighting`,
  `monsters` (the folders' data), `core/types`, `core/guildMark`, `ecs/world`, `pets` (pet specs),
  `item_rules` (`archangelWeapon`), `@versions/shared/items/petItems`, `ecs/current` (the live world).
- Dependency direction: `BaseClass` / `getBaseClass` come from `core/types` (characterStats only
  re-exports them); the pet specs became `controllers/pets`, the drop model proxy
  `item_rules/dropModelProxy.ts`, the guild mark `core/guildMark.ts`, the pet numbers
  `versions/shared/items/petItems.ts`. Each new door is light, so module load order is unchanged.
- used by: `ecs/systems`, `modules/scope/objects.ts`, `modules/combat/clips.ts`, `modules/scope`,
  `modules/character_select`, `modules/drops`, `modules/gm/admin/skins.ts`, `app/offline.ts`,
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
- `chaosCastleUnit.test.ts`: the castle's weapons per class, own weapons elsewhere, transformed
  players and NPCs keep theirs, no armour glow in the castle.
- `approachPath.test.ts`: walk truncation at range, distance along the sent path, stall capping.
- `deserializeAppearance.test.ts`: `isAppearanceBlank` on empty and real previews.
- `weaponClass.test.ts`: `isTwoHanded` is the item's own `TwoHand` (the wide staffs two-handed, Legendary
  Staff on one-handed), matching `Item_eng.bmd` on every weapon row it has.
- `itemAngle.test.ts`: drop scale and pose per group, worn height, the `ItemAngle` tail rows.
- `itemIcon.test.ts`: the shot covers the item's squares at the original's item depth, loads the
  item's own model under the root at its scale and angle; a worn part (the Queen helm) draws only its
  helm mesh, comes down by `ItemHeight` and keeps its own skeleton; the anchor plus offset (the Lucky
  Penny), a weapon's hands (Mace of the King), the Heart +0's swapped model and scale, the level and
  excellent tier on every mesh and one key per look; no shot for an item with no model; the hover
  turn at 0.45 degrees a millisecond, written into the node's own quaternion; a changed item-effects
  option forgets the shots and asks every look again.
- `npcModelTable.test.ts`: every row names a file in `public/game-assets` and has a scale > 0; the
  tables behave as plain objects and read the folders when asked.
- `trapModels.test.ts`: every (map, trap) pair names an `Object<world+1>` model that exists.
- `trapNpc.test.ts`: a trap on a map without the object it borrows (the laser trap in Kanturu Relics,
  no Object52 there in the original either) stands ready with no body instead of the missing-model box.
- `resolveModel.golden.test.ts`: what every type 0..600 is drawn with (class, scale, base, kit,
  shared classes) and the NPC tables, as hashes; update them on purpose. It runs the real model
  classes under Node.
- `npcLooks.test.ts`: NPCs drawn as the original builds them (Hanzo's scale, the 0.9 default and who sets its own, the plain-model NPCs,
  Zyro, the Cursed Wizard's kit, the plate helpers, the Kalima gates held on key 10, the monsters, traps
  and NPCs that cast no Classic shadow and the ones that lose it in death), each with its source lines.
- `skinTexture.test.ts`: skin / hair / level and hide texture names, and the case of each test.
- `classPartModel.test.ts`: the Monk, mask and ElfC models per class, and that each file ships.
- `weaponAttachment.test.ts`: a glove weapon on no bone and with no clip of its own, in the hands and in town.
- `playerObject.test.ts`: the Cape of Lord and Cape of Fighter load no model (cloth only); the Mantle of Monarch and
  Cape of Overrule keep theirs; the Classic shadow is the body parts and the hand weapons, none for a Uniria
  or Dinorant rider out of town, no weapon in town, no bow or crossbow (`setClassicShadows`, set each frame
  by `ecs/systems/animationSystem.ts`; NPC types by `applyNpcShadow` when their model is made), drawn from half
  alpha (a monster from 0.3); `player.glb`'s cape bone 19 turned as the cloth's `SetFixedVertices` expects
  (x up, -y behind, z across) with the body facing -y.
- `wingObject.test.ts`: the Wing of Ruin layer (a `Data/` bitmap, `getDataTexture`) is read top-down like
  the GLB textures it shares the UVs of, and is drawn on a model whose meshes sit under its model node; a wing
  casts the Classic shadow, its blend card too, a cape's model none (its cloth does).
- `wings.test.ts`: every wake, sprite and pass light hands back one kept colour, still at its own time.
- Also from `controllers/item_rules/`: `portedItems`, `questItemLink`, `weaponAttack` tests.

## Notes

### deserializeAppearance.ts
The 18-byte preview carries everything a remote player's gear can show: level glow, excellent and
ancient passes, wings and the pet. Reading only the item numbers is what once left other players'
effects and wings off. Hands carry no excellent or ancient bit in this layout.

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

### skinTexture.ts
`isSkinOrHairTexture` reads the name as the BMD writes it: `ski` and `hair` are tested byte by byte, so
the capitalised `SkinClass...` textures of the Mistery to Lilium sets are not skin. The flag sits on the
bitmap, which the original shares case-insensitively, so `SkinClass301/302/305` turn skin through the
lower-case names in HelmMale46/47/52/53; the capitalised spellings are only in the class bodies, which
never draw with HideSkin, so the name test alone gives the same drops.

### wings.ts
`MODEL_WING + n` is `{ group: 12, num: n }`; capes are group 13. Not ported because the original
never reads them: the Wings of Soul / Dragon `BlendMeshLight` sines (ZzzObject.cpp:9816-9822) and
the Wings of Spirits `Scale = 0.5` (:5277), both written to the shared `g_ItemObject[Type]`.

### Capes and the cloth
The Cape of Lord (13/30, DarkLordRobe) and Cape of Fighter (12/49, Wing50) draw no model on a character
(`clothOnly`): `RenderLinkObject` skips them (ZzzCharacter.cpp:7004-7011); they are the cloth alone. The
Mantle of Monarch and Cape of Overrule keep their model and add cloth.
- The cloth is `controllers/cloth` (`CPhysicsCloth`, its 25 Hz step, drawing and Classic shadow);
  `PlayerObject.Cloth` / `MonsterObject.Cloth` hang a wearer's set on the body, `ecs/systems/clothSystem.ts` asks the wearers' rule
  (`cloaksFor`, filled by `versions/shared/cloaks`) every frame, and draws the cloth's shadow while a link
  object is drawn (RenderLinkObject's cloth case, :8433-8446).
- Who wears it (`bCloak`, :9162-9240): the Magic Gladiator (`CLASS_DARK`), Dark Lord and Rage Fighter as
  players (not transformed into a monster body, not in Chaos Castle), the Death King and the Nightmare, never a
  Doppelganger (529-539, :9177-9180), and any player a duel or a soccer match colours.
- Ported: the Dark Lord's cape (cloth 2) under the Cape of Lord and the Mantle of Monarch, with the Mantle's
  straps (cloths 4 and 5); the Rage Fighter's cape (cloth 0) under the Cape of Fighter and the Cape of
  Overrule, with the Overrule's straps (cloths 1 and 2); the Magic Gladiator's robe (cloth 0,
  Player/Robe01.jpg / Robe02.jpg, Item/msword03.tga under the Wing of Ruin); the Dark Lord's hair (cloths 0
  and 1, bone 20, Monster/iui06.jpg) and skirt (cloth 3, bone 18, Player/kaa.tga or dark3chima3.tga over the
  class's own body); the duel and Battle Soccer colours, which cloak anyone (`team_cloak.ts`); the Death King's
  robe (Player/Robe03.tga, :9826-9832) and the Nightmare's (a `PCT_CYLINDER` robe on bone 2, :9833-9836).
- Left out: a team colour on a player in a monster's body. The original hangs its class's cloths on that
  monster's bones (bone 19 is a different bone on every body); here it wears none.
- The set is built once and walked as the original walks it: a cloth it skips stays built, unstepped, and
  lays its shadow where it was left; a cape change resets the whole set as `DeleteCloth` does (WSclient.cpp:2474-2491,
  NewUIMyInventory.cpp:1050-1083). Body parts carry a mesh cloth of their own too (`CPhysicsClothMesh`,
  ZzzObject.cpp:10610-10680), as do the Magic Skeletons: not ported, see `controllers/cloth/readme.md`.
