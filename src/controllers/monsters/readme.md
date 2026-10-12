# monsters

The monsters controller: what a monster (or NPC) type is and where types are kept. Each type is
its own folder in `versions/shared/monsters/<name>/` and uses this controller.

## Public API
- `MonsterDef`: one type (`Numb`, `Name`, `maxHealth`, `model`, `subType`, `stats`, and the NPC
  fields below); `MonsterStats`: the original table's row; `MonsterRow`: that row with `Numb` and
  `Name`, as readers always got it.
- NPC fields (`npc.ts`): `hidden`, `npcModel` (`NpcModel`, its `idle` roll `NpcIdleRoll`), `gear` (`NpcGear`, `NpcItem`; its `pk`),
  `transformed` (`NpcTransform`), `trap` (`NpcTrap`), `voice` (`NpcVoice`), `globalVoice`
  (`NpcGlobalVoice`, `NpcGlobalCue`); `talkRange` (tiles, straight line: talked to from there instead of from a
  tile beside it, `ecs/systems/npcTalkSystem.ts`; the Kanturu Gateway Machine, ZzzInterface.cpp:3215).
- Sound fields, read by `sound/packetSounds.ts`: `quietCasts` (skills whose cast sound the type
  never plays; also on a body, `MonsterModelDef.quietCasts`), `teleport` (`MonsterTeleport`: its
  own teleport sound on one world), `appearSound` and `summonSound` (`MonsterSound`: its spawn
  sound, and the one only a 0x1F spawn plays) and `stormSkill` (the skill whose AttackTime replays the
  meteorite storm).
- Look fields: `blendMesh` (its own case's additive mesh, read by the actors controller's
  `blendMeshOf` over the per-body table), `passes` and `bodyLight` (its `RenderMonster` case's own mesh
  passes and the light it sets, read by the actors controller's `applyMonsterLook`), `light` (`MonsterLight`, read by `lighting/characters.ts`), `bodyFx`
  (`MonsterBodyFx`, `bodyFx.ts`: particles, cards on bones (`BodyCard`, `BodyCardSpot`), bone
  ribbons (`BodyRibbon`) and the original's particles (`BodyPuff`) by name, read by `fx/monsterVisuals.ts`;
  shared pieces in `versions/shared/monsters/_shared/bodyFx.ts`); on a body,
  `MonsterModelDef.shatter` (`MonsterShatter`, read by `fx/deathVisuals.ts`); `worldScale` (its
  `Object.Scale` on given worlds, read by the actors controller's `npcSpawnScale`).
- Movement fields, read by `ecs/systems/positionSlideSystem.ts`: `ball` (the Battle Soccer ball's
  `MODEL_BALL` hop, roll and kick; `scope/objects.ts` gives it the `ball` component) and, on a body,
  `MonsterModelDef.slide` (its own speed and stop when the server moves it, and a walk that slides: the Crust).
- `defineMonster(def)`: a monster folder's default export.
- `MonsterRegistry`: `get(numb)` (the table row or null), `def(numb)`, `model(numb)`,
  `maxHealth(numb)`, `having(field)` (every type that sets a field, with its value), `all()`, `add`
  (a later def with the same number replaces the earlier one, for a version's own folder).
- `monsterRegistry`, `registerMonsters`; the monster bodies: `defineMonsterModel`,
  `monsterModelRegistry`, `registerMonsterModels`.

## How it works
- Pure data, no engine imports, so the Bun servers use it too. Sounds are keys (`string`), clip
  states are `MonsterActionType` numbers.
- The content side (`versions/shared/monsters/all.ts`) finds the folders and fills one registry.
- Readers: the actors controller draws a type from its fields (`resolveModelFactory`), the sound
  controller plays `voice` and `globalVoice` (`npcVoices.ts`).

## Change it
- a new kind of per-type data: an optional field on `MonsterDef` (its type in `npc.ts` when it is
  an NPC's), read by the controller that uses it.

## Tests
- `registry.test.ts`: `having`, `def` and a later folder replacing a type, NPC fields included.
- `versions/shared/monsters/monsters.golden.test.ts` covers the registry with the real folders.
- `src/controllers/actors/resolveModel.golden.test.ts` and `src/controllers/sound/npcVoices.test.ts`
  cover the NPC fields as their readers see them.
