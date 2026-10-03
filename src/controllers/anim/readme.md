# anim

Which clip a body plays and how fast, ported from the original's tables. The master controller for
animations: it owns the clip record (`defineAnimation`), the registry and every lookup; each player
clip is one file in `versions/shared/animations/` that says its own speed, flags and mappings.

## Public API
- `index.ts` (the door): `defineAnimation`, `registerAnimations`, `animations` (registry),
  `AnimationDef` / `SpeedRule` / `FrameSpeed`; `defineMonsterSwing`, `defineMonsterCast` and their
  `register*`; `playerActionEnumSource` / `replacePlayerActionEnum` (the enum writer); `monsterPlaySpeed`.
- `playSpeed.ts`:
  - `playerPlaySpeed(action, attackSpeed, magicSpeed, isRageFighter)`: a player clip's `PlaySpeed`
    (ZzzOpenData.cpp:314-372, `SetAttackSpeed` ZzzCharacter.cpp:812-1028, `SetPlayerWalk` :396-453).
  - `attackSpeedFactor`, `magicSpeedFactor`: the stat multipliers (`SetAttackSpeed`, ZzzCharacter.cpp:812-908;
    `MagicSpeed2` steps on its own ranges, 0.002 outside them).
  - `playerFrameSpeedScale(action, frame, darkLord)`: per-frame slow-downs (ZzzCharacter.cpp:2497-2517).
  - `debuffSlowsClip(action)`: clips a Freeze or Cold slows (ZzzCharacter.cpp:496-542).
  - `wingsPlaySpeed`, `RAGEFIGHTER_STOP_SPEED`, `monsterPlaySpeed(modelType, action)`,
    `monsterModelTypeOf(npcType)`, `applyPlayerActionSpeed(model, action, attrs)`.
  - `REFERENCE_FPS` (25), `BMD_KEYS_PER_SECOND` (24), `PLAY_SPEED_TO_RATIO`.
  - `serverMinAttackInterval(attackSpeed)`: the shortest gap between attack requests OpenMU's
    speed-hack check accepts, with a 10% margin.
- `playerActionMapper.ts`: `isPlayerAttackAction`, `isPlayerSkillAction` (ZzzInterface.cpp:7570-7580),
  `isStandingIdle`, `isOneShotPlayerAction`, `isRestAction`, `ServerToClientActionMap` (server action
  -> clip), `resolveGenderedAction` (also exported from the door).
- `monsterAttackClip.ts`: the attack / cast clip of a non-player body (`SetPlayerAttack`,
  `SetPlayerMagic`, ZzzCharacter.cpp:1222-1348) with the per-map hooks: `monsterAttackState`,
  `monsterSwing` (0x18), `monsterCast` (0x19 `ReceiveMagic`), `monsterAreaCast` (0x1E),
  `monsterCastAttacks`, `monsterCastRewinds`, `playableMonsterClip`, `isMonsterSwingClip`,
  `monsterFlinches` (WSclient.cpp:3380-3386), `KEEP_CLIP`.

## How it works
- `animation.ts`: `AnimationDef` is one clip: `action` (the PlayerAction id: GLB clip index and wire
  value), `name`, `speed`, and the optional `frameSpeeds`, `debuffSlows`, `attack`, `skill`, `emote`,
  `oneShot`, `idle`, `social`, `rest`, `wingsFlap`, `female`, `serverActions`. Every lookup reads the
  registry; an id no file names gets the base table default (0.40 from PLAYER_SIT1 up, else 0.28).
- `SpeedRule`: a number, `{ base, plus: 'attackSpeed' | 'magicSpeed' | 'magicSpeedStepped' | 'rageAttackSpeed', times? }`
  = `(base + factor) * times`, or `{ base, rageFighter }` for the walk tables.
- `isOneShotPlayerAction` is `attack || skill || emote || oneShot`.
- The PlayerAction enum in `versions/shared/objects/enum.ts` is generated from the files
  (`playerActionEnum.ts`, run by `versions/shared/animations/write_enum.ts`), ids explicit.
- `monsterRules.ts`: the skill-keyed data of the monster side. Swing rules (`MonsterSwingDef`: by
  npc number or body, a clip per `c->Skill`, `'keep'` / `'coin'`) run first when they have no
  `worlds`, and right after the siege guards when they do (their maps are none of the other hooks').
  `MonsterCastDef` per skill: what a monster's `ReceiveMagic` plays, and whether it records
  `c->Skill` or starts AttackTime.
- Speeds are in the original's units: `PlaySpeed` keys per tick at 25 ticks/s. GLB clips are
  authored at 24 keys/s, so Babylon's `speedRatio = PlaySpeed * 25 / 24` (`render/modelObject.ts`).
- Monster speeds are keyed by model index, read off the body files (versions/shared/monster_models);
  `monsterModelTypeOf` maps an npc number to its model.
- `applyPlayerActionSpeed` sets the attack / cast rate at once, so a duration read in the same frame
  does not see the idle rate.
- Monster attack state (`c->SwordCount`, `c->Skill`) lives in a `WeakMap` keyed by the owner.
  `c->Skill` clears once the 15-tick AttackTime runs out, like `MoveCharacter`.
- `KEEP_CLIP` means the hook chose no clip: the one in hand plays on. `playableMonsterClip` falls
  back to Attack1 for a clip the model lacks (ZzzAI.cpp:423).
- The server request may wait while the clip plays fast: `serverMinAttackInterval` mirrors
  OpenMU's `SpeedHackDetectPlugIn` defaults.

## Depends on / used by
- uses: `actors/monsterModelTable.ts`, `actors/locomotion.ts`, `versions/shared/objects/enum`.
- filled by: `versions/shared/animations/all.ts`, imported by each version's core module.
- used by: ECS systems (animation, attack, skill cast, death, emote, band, weapon trail, ...),
  `actors/`, `combat/`, `render/modelObject.ts`, `sound/` monster and packet sounds,
  `modules/combat/net.ts`, some monster and map content.

## Change it
- a player clip's speed, flags or mappings: its file in `versions/shared/animations/`; cite the
  original line.
- a new player clip: a new file there with the next id, then `bun versions/shared/animations/write_enum.ts`.
- a monster clip speed: `clipSpeeds` / `speedScale` in the body file (versions/shared/monster_models/<body>.ts).
- a monster's skill-keyed swing: `versions/shared/animations/monster_swings/`; what a skill plays on a
  monster caster: `versions/shared/animations/monster_casts/`.
- the other map hooks (CheckMonsterSkill lists, coin flips, Attack1 lists): `monsterAttackClip.ts`;
  add a case to `monsterAttackClip.test.ts` first.

## Tests
- `anim.golden.test.ts`: the PlayerAction ids, every clip's speed over an attack / magic speed grid
  and both walk tables, the per-frame scale, every flag, the gender and server maps.
- `monsterAttackClip.golden.test.ts`: swing and cast sequences over every map, named monster, body
  and skill, traps included; which skills attack or rewind.
- `animation.test.ts`, `monsterRules.test.ts`: the registries, the enum writer, the rule kinds.
- `monsterAttackClip.test.ts`: the default swing count, `ReceiveMagic` on monsters, special
  bodies (Bali, traps, siege guards), Kalima and every map hook, when `c->Skill` clears,
  `playableMonsterClip`, `monsterFlinches`, `isMonsterSwingClip`, per-owner state.
- `playSpeed.test.ts`: the `MagicSpeed2` steps; Dark Lord per-frame clip speeds (party teleport hold, Electric Spike
  charge, Earthshake and ride clips, command clip after key 6).
