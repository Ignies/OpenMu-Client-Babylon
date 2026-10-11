# animations

One file per player clip (`<action>.ts`, the enum name without `PLAYER_`, lowercased), plus the
monster side's skill-keyed data. Pure data registered with the anim controller
(`src/controllers/anim`) by `all.ts`, which each version's core module imports.

## Public API
- `<action>.ts`: `export default defineAnimation({ action, name, speed, ... })` (see `AnimationDef`).
- `monster_swings/<name>.ts`: `defineMonsterSwing` - which clip a monster swings with per `c->Skill`.
- `monster_casts/<skill>.ts`: `defineMonsterCast` - what a skill plays on a monster caster.
- `all.ts`: registers every file (Vite glob, Bun `require` fallback).
- `write_enum.ts`: rewrites `PlayerAction` in `../objects/enum.ts` from the files.

## How it works
- `action` is the PlayerAction id: the index of the clip in the GLB and the wire value. Ids run
  0..n-1 with no gaps; never renumber one.
- `PLAYER_FLY_RIDE` carries `aliases: ['PLAYER_ATTACK_END']`: the original's end-of-attacks mark
  shares its id.
- The original's riding Gigantic Storm / Wheel clips (`YDG_ADD_SKILL_RIDING_ANIMATIONS`) are not
  in this client's GLBs and have no file.
- Each file's comment cites where its speed comes from.

## Change it
- A new clip: add `<action>.ts` with the next id, run `bun versions/shared/animations/write_enum.ts`,
  then use `PlayerAction.<NAME>`.
- A speed or flag: edit the clip's file. The golden test `src/controllers/anim/anim.golden.test.ts`
  fails on purpose; update its hash only when the change is meant.

## Tests
- `animations.test.ts`: file names match their clip, ids are 0..n-1 once each, the enum matches the
  files, female variants and server actions resolve, swing and cast files are unique.
