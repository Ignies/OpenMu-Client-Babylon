# skills

Every skill's look, sound, light, clip and skill-only rules. One folder per skill, grouped by
class. Recipe: [docs/how_to/add_skill.md](../../../docs/how_to/add_skill.md).

## Public API
- `SHARED_SKILLS` (`index.ts`): every `SkillDef` found, sorted by id. Importing `index.ts` also
  registers them with the skills controller, plus the common buff looks and the launcher arrows.
- `skillsDatabase.ts`: `SKILL_DEFINITIONS`, `skillDefinition(num)` and the `SkillDefinition` type.
  The server's skill table (OpenMU `VersionSeasonSix/SkillsInitializer.cs`), generated, not edited
  by hand. Numbers are the wire `SkillNumber`. Below it, by hand: `MASTER_REPLACES` (the skill
  each active master skill replaces) and `masterRoot(num)`; `skillDefinition` gives a master skill
  its root's type, target, damage type and area, as OpenMU's `AddMasterSkillDefinition` does, so it
  goes out on the wire as its base skill (cost, reach and requirements stay its own).
- `skillVisuals.ts`: the old entry point, kept so its importers stay unchanged. It loads
  `index.ts` and re-exports the dispatch functions (`playTargetedSkillVisual`,
  `playAreaSkillVisual`, `playBowShotVisual`, `setBuffVisual`, `playBuffHits`, ...) and three
  skill helpers (`playChainLightningHop`, `playTeleportFlash`, `playSummonArrival`).
- `_shared.ts`: steps and helpers several classes use (stones, comets, decay smoke, Iron Defense,
  summon arrival and light, clip-key timing (`whenClipKey`, `eachClipTick`: a step each tick while the
  caster plays a clip), light anchors, mounted clip sets, `landingSound`: a
  `soundOnLanding` skill's sound from the caster, put inside `afterRelease` for a release-block `PlayBuffer`;
  `bodyLight`: an effect model's BodyLight, the terrain light under it plus its Light, and `terrainLevel` that terrain
  light as a grey level (the Dark Knight's and Charge's sword force); the MODEL_MULTI_SHOT volley,
  `multiShotVolley` at the caster's facing or `multiShotVolleyAt` an angle: seven rings that grow where they are made;
  `movesAt`: the moves an effect has made after `t` seconds; `JOINT_SPARKS` and `sparkHeading`: BITMAP_JOINT_SPARK
  sub0, the Dark Knight's Rush and the Rage Fighter's Charge).

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
  `castsAsSpell`, `othersSee`, `quietOn`, `magicIsHit`, `noFlinch`, `holdsFacing`, `clipSound`,
  `soundOnLanding`, `silentHeroCast`, `targetSound`, `kill`, `effect`, `effectAliases`, `buffHits`,
  `explicitHits`, `checksArrows`, and the combat hooks (Nova, Combo, Dark Side).
- Deliberate deviation: `effectAliases` (on the base skill) and the Rage Fighter `effect`s 129-131
  let a master or Rage Fighter `MagicEffectCancelled` drop its buff. The original's
  ReceiveMagicFinish has those cases but reads the skill as a BYTE (WSclient.cpp:3884), so ids 256+
  never match there and the buff stayed on until its timer ran out. It is the `masterBuffCancel`
  improvement (`versions/shared/improvements/`): on Classic `cancelledEffects` drops nothing for 256+.
- Classes: `dark_wizard`, `dark_knight`, `fairy_elf`, `magic_gladiator`, `dark_lord`, `summoner`,
  `rage_fighter`, plus `monsters` (monster-only skills) and `common` (every class or none).
- `defineSkill` fields are listed in [docs/content.md](../../../docs/content.md).

## Skill effects: Original / Enhanced
The `enhancedSkillEffects` improvement (also the Options window's Skill effects choice). Classic and
Original draw the original; Enhanced draws our look where we made one. A skill picks its branch in
one place, `tiered(original, enhanced)` (or `enhancedSkillFx()`) from `@/controllers/skills/visuals`.
A pure bug fix (timing, bone, leak, crash) stays on both branches.

| skill | Original (cite) | Enhanced (ours) | restored from |
|---|---|---|---|
| Evil Spirit (9, 385, 487) | four JOINT_SPIRIT pairs homing on the caster, a MODEL_LASER skull on each wide one (ZzzCharacter.cpp:4584-4604) | eight spirits orbiting the skill's reach in two waves (`fx/spiritSwarm.ts`), a smoke trail behind each and the screen shroud (`fx/shroud.ts`); one trail and shroud per caster while they last, at most 2 shrouds on screen | 7b8e0acfc, ffc2dcdec, 872baefa9 |

## Depends on / used by
- uses: `@/controllers/skills`, `fx`, `lighting`, `sound`, `combat`, `render`; `../items/launcher_arrows`
- used by: `src/modules/{combat,skills,scope,_shared}`, `src/ecs/systems` (through
  `skillVisuals.ts`); `skillsDatabase.ts` by `inventory`, combat, lighting and skill widgets;
  `versions/<id>/tables`

## Change it
- change a skill: edit its folder's `index.ts` or variant file.
- add a skill: add `<class>/<snake_name>/index.ts` with a default `defineSkill`.
- share a step: move it to `<class>/_shared.ts` (one class) or `_shared.ts` (several).
- a skill file never imports another skill's folder.

## Tests
- `skillVisuals.golden.test.ts`: runs ids 0-620 targeted and area (classic and max lighting) on both Skill
  effects branches (Original, then Enhanced from the same tick: `enhanced: same` when the skill has one look),
  buff looks 0-160 and bow shots for launchers 0-30 headless with seeded random; snapshots the
  spawn and light counts and a hash.
- `tiered.test.ts`: `tiered` runs the original on Classic and ours on Enhanced.
- `skillTables.golden.test.ts`: per id 0-700, the light, sound, clip (per mount, gender, map),
  cast target, step-in and delay it resolves to.
- `skillRules.golden.test.ts`: per id 0-700, the clip `chooseSkillAction` picks over hands,
  class, SwordCount, mount, gender, map and coin toss; SwordCount; clip-paired and landing
  sounds; the clips that hold facing or ignore a hit; master aliases; the cancel effect.
- `skillEffectSlots.test.ts`: Hell Fire, Inferno, Twister and Fire Scream mark the model the original
  keeps in `g_SkillEffects` (SkillEffectMgr.cpp:33-62) when the hero casts them, and nothing else.
- `castRules.test.ts`: the quiet mount (Defense), what others see (Electric Spike), the kill
  rules (Nova, Combo), Nova's hook numbers, the cancel effects (masters included) against `ReceiveMagicFinish`
  (WSclient.cpp:3878). `rage_fighter/party_buffs.test.ts`: the party buffs'
  coin toss and its paired sound. `rage_fighter/timing.test.ts`: when each Rage Fighter skill
  draws and sounds against the 25 Hz tick and the caster's clip.
- `skillsDatabase.test.ts`: a Strengthener or Mastery takes its base skill's shape and keeps its own
  cost, reach and requirements.
- `releaseTiming.test.ts`: when Fire Ball leaves against the caster's magic speed: 14 ticks at a
  slow clip, on the clip's key 5 at a fast one; Force on its strike clip's key 3 at a low and a
  high attack speed, at 25 and 60 fps, and 0.56 s after the packet when the key never comes.
- `facing.test.ts`: the effect models and summon bodies a skill turns to its caster's facing, a bearing
  or an angle of the original's face where `AngleMatrix` of that `o->Angle` points, and the casting
  circles and the Alice curse rings turn the original's way; Gigantic Storm's stone chips fly off backward
  from their own Angle; Ice Arrow's ice takes its target's; an arrow and Fire Ball fly nose first; Lance's stars
  spin from the caster's Angle; Zaikan's staffs keep their tipped Angle. A model's `yaw` is the node's: a caster's facing is `-entityYaw`.
- Tests that load the skills import `./skillVisuals` first (it keeps the app import cycle in
  order) and stub `fetch` in `vi.hoisted`: Data/ is not there under Node.
- Snapshots are in `__snapshots__/`. When a change is meant, update them with
  `bunx vitest run versions/shared/skills -u` and say why in the PR. `GOLDEN_FULL=1` snapshots
  the full trace instead of the hash.
