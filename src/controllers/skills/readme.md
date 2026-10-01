# skills

The skill controller: `defineSkill` (the shape of one skill file), `registerSkills` (writes skill
files into every controller table) and the skill visual engine (`visuals.ts`). The skills
themselves are content in `versions/shared/skills/` (see [docs/content.md](../../../docs/content.md)).

## Public API
- `defineSkill(def)` / `defineBuffLooks(looks)` (`define.ts`): identity helpers that type a skill file
  and a set of buff looks. `SkillDef` lists the fields.
- `registerSkills(defs)` (`index.ts`): copies each field into the table that reads it and throws
  if an id is defined twice. `registerBuffLooks`, `registerLauncherArrows` fill the buff look and
  bow arrow tables.
- `visuals.ts` step DSL, used by skill files: `sprite`, `particles`, `model`, `ring`, `seq`,
  `atCaster`, `scatter`, `ringOf`, `after`, `repeat`, `offset`, building blocks (`fireHit`,
  `arcHit`, `steelHit`, `explosion`, `scorch`, `burn`, `magicGround`, ...), travel (`bolt`, `arrow`),
  `fanArrows`, `onCurseLanding`, units (`ticks`, `cm`, `perTick`, `TICK`).
- Dispatch, used by features and ECS systems through `versions/shared/skills/skillVisuals.ts`:
  `playTargetedSkillVisual`, `playAreaSkillVisual`, `playBowShotVisual`, `setBuffVisual`,
  `clearBuffVisuals`, `skillVisualFor`, `baseSkill`, `fallbackFor`.

## How it works
- `registerSkills` writes `visual` into `SKILL_VISUALS`, `light` into `lighting/skills.ts`,
  `sound` into `sound/combat.ts`, `clip` into `combat/recipes.ts`, `delayMs` into
  `features/skills/recipes.ts`, `target` / `stepIn` into the combat tables, `buffs` /
  `buffArrivals` into `BUFF_VISUALS` / `BUFF_ARRIVALS`, and `combat.layer` / `combat.hooks` into
  the combat controller. It is the only writer of those tables.
- A `SkillVisual` row has four moments, each a `Step` (a function of a point and a
  `SkillContext`): `cast` at the caster, `travel` (a projectile whose arrival fires `impact`),
  `impact` at the target, `area` at the ground point. `enhanced` replaces moments from lighting
  tier `ENHANCED_TIER` up; Classic always draws the row itself.
- Units follow the original: lifetimes are 25 Hz ticks (`ticks(n)` = n * 0.04 s), distances are
  centimetres / 100 (`cm`). Rows cite the MODEL_* / BITMAP_* they stand in for (ZzzCharacter.cpp
  `AT_SKILL_*` impact block and `AttackStage`, WSclient.cpp `ReceiveMagic`, ZzzEffect.cpp
  `CreateEffect` / `CreateParticle` / `CreateJoint`).
- Lookup (`skillVisualFor`): the skill's own row, else its master alias row, else `fallbackFor`
  the skill's type and damage type from `skillsDatabase`, so no skill is clip-only.
  `MASTER_ALIASES` maps OpenMU master numbers (300+) to their base row (the original's
  SKILL_REPLACEMENTS), plus the Dark Lord and Magic Gladiator alias tables and `150 -> 50`.
- Light is not decided here: dispatch calls `lighting.skillTargeted` / `lighting.skillArea`, and
  every projectile goes through `shoot`, which asks `lighting.arrow` for a flight light.
- `playBowShotVisual`: the plain bow / crossbow shot (ZzzCharacter.cpp:4700-4735,
  `CreateArrow` ZzzEffectMagicSkill.cpp:174-251). The arrow comes from `LAUNCHER_ARROWS` by
  launcher item index; the Aquagold Crossbow bolt bursts on landing (ZzzEffect.cpp:6620).
- Buff looks: `setBuffVisual` runs the effect's `BUFF_ARRIVALS` entry first, then keeps one
  `aura` effect per entity and effect id (`BUFF_VISUALS`, keyed by MagicEffect number =
  `eBuffState`). Ids 1, 2, 3 share one green joint knot (ZzzEffectJoint.cpp:4440).
- In dev builds `window.__skillVisuals.area / targeted / buff` fire a row by hand.

## Depends on / used by
- uses: fx (`effects.spawn`), lighting, combat, sound and weather (`scorch`, `burn`) controllers,
  `versions/shared/skills/skillsDatabase`. Old exceptions to the dependency rule (listed in
  `tools/checks/baselines/deps.json`): `features/skills/recipes.ts`, `features/skills/skillAliases.ts`,
  `app/storeRef.ts` (dev hook only).
- used by: every skill file in `versions/shared/skills/`, which registers them in
  `versions/shared/skills/index.ts`; `versions/shared/skills/skillVisuals.ts` re-exports the
  dispatch for `features/combat`, `features/skills`, `features/_shared/net_helpers.ts` and the
  attack and teleport ECS systems.

## Change it
- change one skill's look: edit its `versions/shared/skills/<class>/<skill>/index.ts`.
- add a skill field: add it to `SkillDef` in `define.ts` and copy it into its table in
  `registerSkills` (`index.ts`).
- add a step helper or building block: `visuals.ts`, next to the ones it resembles.
- change what a skill with no row draws: `fallbackFor` in `visuals.ts`.
- map a new master skill onto its base look: `MASTER_ALIASES` in `visuals.ts`.

## Tests
No tests in this folder. The golden tests in `versions/shared/skills/` cover it:
- `skillVisuals.golden.test.ts`: what every skill id spawns on cast, area, bow shot and buff.
- `skillTables.golden.test.ts`: what every id resolves to for light, sound, clip, target,
  step-in and delay.
