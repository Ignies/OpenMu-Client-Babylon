# monster_models

Every monster body (`MODEL_MONSTER01 + type`), one file each: what it sounds like and how fast
its clips play. Several monster types share a body (the seven Orc Archer variants are one), so
these follow the body, not the type; a type points at its body with `model.type` in its monster
folder.

```
<body>.ts   export default defineMonsterModel({ type, name, voices, subType9Voices?, clipSpeeds?, speedScale? })
all.ts      finds every file (glob in the client and tests, from disk in the Bun servers)
```

## Public API
- `all.ts` fills the monsters controller's body registry (`monsterModelRegistry`) with these files.
  Code reads bodies through the controllers: `monsterVoices` / `playMonster` (sound),
  `monsterPlaySpeed` (anim).

## How it works
- `voices`: `Models[type].Sounds[0..4]` from `OpenMonsterModel` (ZzzOpenData.cpp): [0..1] idle /
  walk, [2..3] attack / hit, [4] death, null silent. All five null: the body never calls
  `SetMonsterSound`; the ones that do speak are voiced per map (`controllers/sound/mapMonsters.ts`).
- `subType9Voices`: the next five waves, played by types created with `SubType = 9` (their monster
  folder says `subType: 9`).
- `clipSpeeds` (by `MonsterActionType`) and `speedScale` (Stop1..Shock only): the per-body lines of
  `OpenMonsterModel` (ZzzOpenData.cpp:2380-2440) over the shared defaults in `anim/playSpeed.ts`.
- `versions/shared/monsters/all.ts` loads this folder, and each version's core module loads that.

## Change it
- a body's voice or clip speed: edit its file. A new body: a new file.

## Tests
- `monsterModels.golden.test.ts`: every body's voices (dice fixed both ways, SubType 9 too) and
  every clip speed, as behaviour, unchanged; update on purpose.
- `controllers/sound/monsters.test.ts`, `mapMonsters.test.ts`: catalogue keys, special voices.
