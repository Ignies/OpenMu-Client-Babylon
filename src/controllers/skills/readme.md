# skills

The skill controller: `defineSkill` (the shape of one skill file), `registerSkills` (writes skill
files into every controller table) and the skill visual engine (`visuals.ts`). The skills
themselves are content in `versions/shared/skills/` (see [docs/content.md](../../../docs/content.md)).

## Public API
- `defineSkill(def)` / `defineBuffLooks(looks)` (`define.ts`): identity helpers that type a skill file
  and a set of buff looks. `SkillDef` lists the fields.
- `registerSkills(defs)` (`index.ts`): copies each field into the table that reads it and throws
  if an id is defined twice. `registerBuffLooks`, `registerLauncherArrows` fill the buff look and
  bow arrow tables. `cancelledEffects(skill, scene, target)`: the effects a `MagicEffectCancelled`
  naming `skill` drops, after running its `cancel` hook (`SkillCancel`). `hasWarriorGlint(skill, mounted)`: the skill's `warriorGlint` field, for
  `skillCastSystem` (item_fx draws the glint).
- `visuals.ts` step DSL, used by skill files: `sprite`, `particles`, `model`, `ring`, `seq`,
  `atCaster`, `scatter`, `ringOf`, `after`, `repeat`, `offset`, building blocks (`fireHit`,
  `arcHit`, `steelHit`, `explosion`, `scorch`, `burn`, `magicGround`, ...), travel (`bolt`, `arrow`),
  `fanArrows` (`every`: one arrow at a time, Multi-Shot), `onCurseLanding`, `weaponsOf(e)` (`c->Weapon`: the castle's weapons inside Chaos
  Castle, `actors.heldWeapons`), units (`ticks`, `cm`, `perTick`, `TICK`); the release: `onRelease(c, fn, rule?)`,
  `afterRelease(step, rule?)`, `ReleaseRule`, `NO_KEY`, `afterHeroRelease(fn)`.
- Dispatch, used by modules and ECS systems through `versions/shared/skills/skillVisuals.ts`:
  `playTargetedSkillVisual`, `playAreaSkillVisual`, `playBowShotVisual`, `setBuffVisual`,
  `clearBuffVisuals`, `playBuffHits`, `skillVisualFor`, `baseSkill`, `fallbackFor`;
  `playSkillImpact`: a row's `impact` alone, one more blow of a cast already drawn (Dark Side's
  follow-ups, `skillCastSystem`).

## How it works
- `registerSkills` writes `visual` into `SKILL_VISUALS`, `lookAliases` / `masterAliases` into
  `LOOK_ALIASES` (and `MASTER_BASES`, `combat/skillAliases.ts`), `light` into
  `lighting/skills.ts`, `sound` / `clipSound` / `soundOnLanding` / `silentHeroCast` / `targetSound` into
  `sound/combat.ts`, `delayMs` into `combat/skillDelays.ts` (`SKILL_DELAY_MS`), `effect` (also under
  each of its `effectAliases`) into `tables.ts` (`SKILL_EFFECTS`), `cancel` into the table `cancelledEffects` reads, `buffs` /
  `buffArrivals` / `buffHits` into `BUFF_VISUALS` / `BUFF_ARRIVALS` / `BUFF_HITS`, and hands
  the combat fields (clip rules, `target`, `stepIn`, `noFlinch`, `holdsFacing`, `quietOn`,
  `othersSee`, `explicitHits`, `kill`, `combat.layer` / `combat.hooks`) to
  `combat.registerSkill`. It is the only writer of those tables.
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
  `LOOK_ALIASES` maps OpenMU master numbers (300+) to their base row (the original's
  SKILL_REPLACEMENTS); each base skill lists its own, and `150 -> 50` is Flame of Evil's.
- The release (`onRelease`): a cast's packet sets AttackTime to 1 and its effect fires when it
  reaches 15, 14 ticks later, unless AttackStage forces it first because the caster's clip passed its
  key (ZzzCharacter.cpp:2587-2604, :3052-3060, :4132-4140). By default the key is 5 and the clip one
  of `combat.releasesOnKey` (PLAYER_ATTACK_FIST .. PLAYER_RIDE_SKILL, a monster's Attack1 / 2); a
  `ReleaseRule` names another key or clip set (`NO_KEY`: none, the case forces nothing) and `limit`, the
  cast's `g_iLimitAttackTime` (Penetration's 5). Clip speed follows attack / magic speed, so a fast
  caster releases on the clip (2 ticks for Fire Ball at magic speed 1400) and a slow one at 14.
  The live model is checked every frame from one tick after the packet; a caster with no model waits
  the 14 ticks.
- `afterRelease` hands its step the skill dispatched with it as `currentSkill`, so a step that reads
  it (`fanArrows`) still sees its own skill. A row's `travel` with `release` leaves at the release
  instead of the packet (Starfall, Ice Arrow).
- The hero's own casts are watched with the default rule: `afterHeroRelease(fn)` runs `fn` at the
  last one's release (or now when it has released), never later than 14 ticks after it. The kill's
  ATTACK_DIE energy waits on it (`modules/combat`, ZzzCharacter.cpp:5242-5247).
- Light is not decided here: dispatch calls `lighting.skillTargeted` / `lighting.skillArea`, and
  every projectile goes through `shoot`, which asks `lighting.arrow` for a flight light.
- `playBowShotVisual`: the plain bow / crossbow shot (ZzzCharacter.cpp:4700-4735,
  `CreateArrow` ZzzEffectMagicSkill.cpp:174-251). The arrow comes from `LAUNCHER_ARROWS` by
  launcher item index; the Aquagold Crossbow bolt bursts on landing (ZzzEffect.cpp:6620).
- Buff looks: `setBuffVisual` runs the effect's `BUFF_ARRIVALS` entry first, then keeps one
  `aura` effect per entity and effect id (`BUFF_VISUALS`, keyed by MagicEffect number =
  `eBuffState`). Ids 1, 2, 3 share one green joint knot (ZzzEffectJoint.cpp:4440).
- Buff hits: `playBuffHits(scene, wearer, attacker)` runs every `BUFF_HITS` entry whose effect the
  wearer holds (Soul Barrier's shell on the hero, WSclient.cpp:3282-3291).
- In dev builds `window.__skillVisuals.area / targeted / buff` fire a row by hand.

## Depends on / used by
- uses: fx (`effects.spawn`), lighting, combat, sound and weather (`scorch`, `burn`) controllers,
  `versions/shared/skills/skillsDatabase`, `ecs/current` (the live world, dev hook only).
- Dependency direction: the tables the skills module and the lighting, sound and combat controllers
  read (`MASTER_BASES`, `SKILL_DELAY_MS`) live in `combat`, not here: this door imports combat,
  lighting, sound and the visual engine, so a reader importing it would close a cycle.
  `skillDisplayName` lives in `assets/mu/skillNames.ts`, beside the language pack it reads.
- used by: every skill file in `versions/shared/skills/`, which registers them in
  `versions/shared/skills/index.ts`; `versions/shared/skills/skillVisuals.ts` re-exports the
  dispatch for `modules/combat`, `modules/skills` and the
  attack and teleport ECS systems.

## Change it
- change one skill's look: edit its `versions/shared/skills/<class>/<skill>/index.ts`.
- add a skill field: add it to `SkillDef` in `define.ts` and copy it into its table in
  `registerSkills` (`index.ts`).
- add a step helper or building block: `visuals.ts`, next to the ones it resembles.
- change what a skill with no row draws: `fallbackFor` in `visuals.ts`.
- map a new master skill onto its base look: add it to the base skill's `lookAliases` (look only)
  or `masterAliases` (clip, sound, light and look).
- a controller that treats one skill differently: add a `SkillDef` field and write it in
  `registerSkills` (or `combat/skillRules.ts` for combat fields); never test a skill number there.

## Tests
No tests in this folder. The tests in `versions/shared/skills/` cover it (`releaseTiming.test.ts`
for the release):
- `skillVisuals.golden.test.ts`: what every skill id spawns on cast, area, bow shot and buff.
- `skillTables.golden.test.ts`: what every id resolves to for light, sound, clip, target,
  step-in and delay.
- `skillRules.golden.test.ts`: cast clip by pose, SwordCount, clip and landing sounds, flinch and
  facing clips, master aliases, cancel effects. `castRules.test.ts`: quiet mounts, what others
  see, kill rules, Nova's hook numbers, the warrior glint.
