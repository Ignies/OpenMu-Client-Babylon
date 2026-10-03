# skills

Every skill's look, sound, light, clip and skill-only rules. One folder per skill, grouped by
class. Recipe: [docs/how_to/add_skill.md](../../../docs/how_to/add_skill.md).

## Public API
- `SHARED_SKILLS` (`index.ts`): every `SkillDef` found, sorted by id. Importing `index.ts` also
  registers them with the skills controller, plus the common buff looks and the launcher arrows.
- `skillsDatabase.ts`: `SKILL_DEFINITIONS`, `skillDefinition(num)` and the `SkillDefinition` type.
  The server's skill table (OpenMU `VersionSeasonSix/SkillsInitializer.cs`), generated, not edited
  by hand. Numbers are the wire `SkillNumber`.
- `skillVisuals.ts`: the old entry point, kept so its importers stay unchanged. It loads
  `index.ts` and re-exports the dispatch functions (`playTargetedSkillVisual`,
  `playAreaSkillVisual`, `playBowShotVisual`, `setBuffVisual`, `playBuffHits`, ...) and three
  skill helpers (`playChainLightningHop`, `playTeleportFlash`, `playSummonArrival`).
- `_shared.ts`: steps and helpers several classes use (stones, comets, decay smoke, Iron Defense,
  summon arrival and light, clip-key timing, light anchors, mounted clip sets).

## How it works
```
<class>/<skill>/index.ts        export default defineSkill({ id, name, visual, light, sound, clip, ... })
<class>/<skill>/strengthener.ts a master variant: its own defineSkill (also mastery.ts,
                                proficiency.ts, power_up*.ts, strengthener_magic_gladiator.ts)
<class>/<skill>/<logic>.ts      state only this skill has (nova/charge.ts, combo/state.ts,
                                dark_side/rage.ts); no default export, so the glob skips it
<class>/_shared.ts              helpers for several skills of one class
_shared.ts                      helpers for several classes
```
- `index.ts` globs `./*/*/*.ts` (not tests), keeps each default export that has a numeric `id`,
  and calls `registerSkills`. Adding a skill is adding its file.
- A variant file is often only `id`, `name` and an `enhanced` light. Master ids without a file
  are listed on their base skill: `lookAliases` (they draw as it) or `masterAliases` (they also
  cast, sound and light as it: the Dark Lord and Magic Gladiator ones).
- Everything a controller does differently for one skill is a field of its file, never a branch
  in the controller: the clip pick (`clip` as a function, `poseClip`, `swing`), `swordCount`,
  `castsAsSpell`, `othersSee`, `quietOn`, `noFlinch`, `holdsFacing`, `clipSound`,
  `soundOnLanding`, `silentHeroCast`, `kill`, `effect`, `buffHits`, `explicitHits`, and the
  combat hooks (Nova, Combo, Dark Side).
- Classes: `dark_wizard`, `dark_knight`, `fairy_elf`, `magic_gladiator`, `dark_lord`, `summoner`,
  `rage_fighter`, plus `monsters` (monster-only skills) and `common` (every class or none).
- `defineSkill` fields are listed in [docs/content.md](../../../docs/content.md).

## Depends on / used by
- uses: `@/controllers/skills`, `fx`, `lighting`, `sound`, `combat`, `render`; `../items/launcher_arrows`
- used by: `src/modules/{combat,skills,scope,_shared}`, `src/ecs/systems` (through
  `skillVisuals.ts`); `skillsDatabase.ts` by the Store, combat, lighting and skill widgets;
  `versions/<id>/tables`

## Change it
- change a skill: edit its folder's `index.ts` or variant file.
- add a skill: add `<class>/<snake_name>/index.ts` with a default `defineSkill`.
- share a step: move it to `<class>/_shared.ts` (one class) or `_shared.ts` (several).
- a skill file never imports another skill's folder.

## Tests
- `skillVisuals.golden.test.ts`: runs ids 0-620 targeted and area (classic and max lighting),
  buff looks 0-160 and bow shots for launchers 0-30 headless with seeded random; snapshots the
  spawn and light counts and a hash.
- `skillTables.golden.test.ts`: per id 0-700, the light, sound, clip (per mount, gender, map),
  cast target, step-in and delay it resolves to.
- `skillRules.golden.test.ts`: per id 0-700, the clip `chooseSkillAction` picks over hands,
  class, SwordCount, mount, gender, map and coin toss; SwordCount; clip-paired and landing
  sounds; the clips that hold facing or ignore a hit; master aliases; the cancel effect.
- `castRules.test.ts`: the quiet mount (Defense), what others see (Electric Spike), the kill
  rules (Nova, Combo), Nova's hook numbers, the cancel effects against `ReceiveMagicFinish`
  (WSclient.cpp:3878). `rage_fighter/party_buffs.test.ts`: the party buffs'
  coin toss and its paired sound.
- `releaseTiming.test.ts`: when Fire Ball leaves against the caster's magic speed: 14 ticks at a
  slow clip, on the clip's key 5 at a fast one.
- Tests that load the skills import `./skillVisuals` first (it keeps the app import cycle in
  order) and stub `fetch` in `vi.hoisted`: Data/ is not there under Node.
- Snapshots are in `__snapshots__/`. When a change is meant, update them with
  `bunx vitest run versions/shared/skills -u` and say why in the PR. `GOLDEN_FULL=1` snapshots
  the full trace instead of the hash.
