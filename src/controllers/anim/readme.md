# anim

Which clip a body plays and how fast, ported from the original's tables. Pure functions over
action numbers; the ECS `AnimationSystem` and the model objects apply them.

## Public API
- `playSpeed.ts`:
  - `playerPlaySpeed(action, attackSpeed, magicSpeed)`: a player clip's `PlaySpeed`
    (ZzzOpenData.cpp:314-372, `SetAttackSpeed` ZzzCharacter.cpp:830-960).
  - `attackSpeedFactor`, `magicSpeedFactor`: the stat multipliers (ZzzCharacter.cpp:738-826).
  - `playerFrameSpeedScale(action, frame, darkLord)`: per-frame slow-downs (ZzzCharacter.cpp:2497-2517).
  - `debuffSlowsClip(action)`: clips a Freeze or Cold slows (ZzzCharacter.cpp:496-542).
  - `wingsPlaySpeed`, `RAGEFIGHTER_STOP_SPEED`, `monsterPlaySpeed(modelType, action)`,
    `monsterModelTypeOf(npcType)`, `applyPlayerActionSpeed(model, action, attrs)`.
  - `REFERENCE_FPS` (25), `BMD_KEYS_PER_SECOND` (24), `PLAY_SPEED_TO_RATIO`.
  - `serverMinAttackInterval(attackSpeed)`: the shortest gap between attack requests OpenMU's
    speed-hack check accepts, with a 10% margin.
- `monsterAttackClip.ts`: the attack / cast clip of a non-player body (`SetPlayerAttack`,
  `SetPlayerMagic`, ZzzCharacter.cpp:1222-1348) with the per-map hooks: `monsterAttackState`,
  `monsterSwing` (0x18), `monsterCast` (0x19 `ReceiveMagic`), `monsterAreaCast` (0x1E),
  `monsterCastAttacks`, `monsterCastRewinds`, `playableMonsterClip`, `isMonsterSwingClip`,
  `monsterFlinches` (WSclient.cpp:3380-3386), `KEEP_CLIP`.
- `playerActionMapper.ts`: `isPlayerAttackAction`, `isPlayerSkillAction`
  (ZzzInterface.cpp:7570-7580), `isStandingIdle`, `isOneShotPlayerAction`,
  `ServerToClientActionMap` (server action -> clip), `resolveGenderedAction`.

## How it works
- Speeds are in the original's units: `PlaySpeed` keys per tick at 25 ticks/s. GLB clips are
  authored at 24 keys/s, so Babylon's `speedRatio = PlaySpeed * 25 / 24` (applied in
  `render/modelObject.ts`).
- Monster speeds are keyed by model index (`MONSTER_MODEL_TABLE` in `actors/`), not npc number;
  `monsterModelTypeOf` maps one to the other.
- `applyPlayerActionSpeed` sets the attack / cast rate at once, so a duration read in the same
  frame does not see the idle rate.
- Monster attack state (`c->SwordCount`, `c->Skill`) lives in a `WeakMap` keyed by the owner.
  `c->Skill` clears once the 15-tick AttackTime runs out, like `MoveCharacter`.
- `KEEP_CLIP` means the hook chose no clip: the one in hand plays on. `playableMonsterClip` falls
  back to Attack1 for a clip the model lacks (ZzzAI.cpp:423).
- The server request may wait while the clip plays fast: `serverMinAttackInterval` mirrors
  OpenMU's `SpeedHackDetectPlugIn` defaults.

## Depends on / used by
- uses: `actors/monsterModelTable.ts`, `actors/locomotion.ts`, `versions/shared/objects/enum`,
  `features/hero/emotes.ts` (a baselined rule exception in `tools/checks/baselines/deps.json`).
- used by: ECS systems (animation, attack, skill cast, death, emote, band, weapon trail, ...),
  `actors/`, `combat/`, `render/modelObject.ts`, `sound/` monster and packet sounds,
  `features/combat/net.ts`, some monster and map content.

## Change it
- a player clip speed: `playerPlaySpeed` (or `playerFrameSpeedScale` for per-frame changes) in
  `playSpeed.ts`; cite the original line.
- a monster clip speed: `clipSpeeds` / `speedScale` in the body file (versions/shared/monster_models/<body>.ts).
- which clip a monster swings on a map: the hooks in `monsterAttackClip.ts`; add a case to
  `monsterAttackClip.test.ts` first.
- a new server action: add it to `ServerToClientActionMap` in `playerActionMapper.ts`.

## Tests
- `monsterAttackClip.test.ts`: the default swing count, `ReceiveMagic` on monsters, special
  bodies (Bali, traps, siege guards), Kalima and every map hook, when `c->Skill` clears,
  `playableMonsterClip`, `monsterFlinches`, `isMonsterSwingClip`, per-owner state.
- `playSpeed.test.ts`: Dark Lord per-frame clip speeds (party teleport hold, Electric Spike
  charge, Earthshake and ride clips, command clip after key 6).
