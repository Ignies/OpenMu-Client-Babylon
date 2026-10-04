# combat

The client-side timing and rules of fighting: when a swing lands, when the next click counts, a
weapon's reach, which clip a cast plays, who it is aimed at, and the slots for skill-owned state.
It never sends packets or touches the scene; the ECS systems that fight read it and send.

## Public API
- `combat` (`index.ts`): the facade (`implements Controller`). Groups:
  - input gate: `inputGateOpen`, `inputGateRemaining`, `consumeInputGate`.
  - swing latch: `attackTime`, `attackInFlight`, `checkAttackTime(n)`, `startAttack`,
    `hitDelaySeconds`, `cancelAttack`, `setLastAttackEffectTime`; the cast release rule:
    `releasesOnKey(action, monsterRig)`, `RELEASE_TICKS` (14), `RELEASE_KEY` (5), used by the skill
    controller's `onRelease`; `blowHeldTicks`, how long the last hit request waited for its blow
    (`ObjectGotKilled` hands it to `DeathSystem`).
  - weapon: `attackRange(hands)`, `hasAmmo`, `equippedLauncher`.
  - skills: `skillClip(skill, ctx)`, `magicClip`, `othersSeeClip`, `castQuietOn`,
    `clipIgnoresHit`, `skillKill`, `skillStepIn`, `stepInSquare`, `clipHoldsFacing`,
    `castTarget(def)`, `castsOnSelf`, `castsOnSelfOnly`; `registerSkill(id, rules)` (called by
    `registerSkills` only).
  - area hits: `needsAreaHit`, `areaHitRadius`, `buildAreaHit`.
  - skill hooks: Nova (`novaSkill`, `novaBeginSkill`, `beginNova`, `releaseNova`, `novaCharge`, ...), Combo (`comboFlash`,
    `comboKnockUp`, ...), Dark Side (`beginDarkSide`, `nextDarkSideHit`, `rageStreak`, ...).
  - `register(layer)`, `update(map, dt)`, `reset()`.
- `skillHooks` (`skillHooks.ts`): the Nova / Combo / Dark Side slots a skill file fills.
- `recipes.ts`: `SKILL_CLIPS`, `HIT_KEYS`, `SHOCK_IMMUNE_CLIPS`, `RIDER_FLY_WORLDS` (also on the
  door, for Fire Breath and petSystem). No skill numbers: those live in the skill files.
- `skillRules.ts`: `registerSkillRules` / `SkillCombatRules`, the combat half of a skill file.
- `skillKills.ts`: `SkillKill` (`knock`, `dying`) and `skillKill(skill)`.
- Door types: `CastContext`, `CastPose`, `PoseClip`, `ClipPick`, `SkillClipSet`, `SkillKill`,
  `SkillCombatRules`.
- Each entry file is importable on its own for a single function (`isHostilePlayer`,
  `ammoReload`, `MELEE_RANGE`, ...).

## How it works
- `layers.ts` lists the entries, in update order: input gate, attack timing, then reader-only
  entries (weapon range, skill clips, skill movement, cast targets, player target) and the 0xDB
  area-hit counters. `AttackSystem` calls `combat.update` once a frame; `app/lifecycle.ts`
  calls `combat.reset` on a map change.
- Skills plug in through `registerSkills` (`controllers/skills/index.ts`), which hands each
  skill's combat fields to `combat.registerSkill` (`skillRules.ts`): `clip`, `poseClip`, `swing`,
  `swordCount`, `castsAsSpell`, `othersSee`, `quietOn` (`skillClips.ts`), `noFlinch`
  (`SHOCK_IMMUNE_CLIPS`), `holdsFacing`, `stepIn` (`skillMovement.ts`), `target`
  (`castTargets.ts`), `explicitHits` (`areaHit.ts`), `kill` (`skillKills.ts`); its
  `combat.layer` is registered and its `combat.hooks` fill `skillHooks`. An empty slot answers
  "nothing happening". Nova's charge (with its two skill numbers), Combo and Dark Side live with
  their skills in `versions/shared/skills/`. No file here tests a skill number.
- Input gate (`inputGate.ts`, ZzzInterface.cpp:92-93, :7510-7791): a click is acted on only every
  `MouseUpdateTimeMax` (6 ticks, 0.24 s); a swing that fires opens it at once.
- Weapon range (`weaponRange.ts`, ZzzInterface.cpp:3283-3299, `CheckArrow` :3148-3170): 1.8 tiles,
  2.2 with a spear, 6 with a bow or crossbow, which needs arrows / bolts in the other hand.
- Player target (`playerTarget.ts`, `CheckAttack` ZzzInterface.cpp:1752-1783): the duel enemy only
  during a duel; otherwise an outlaw always, anyone while Ctrl is held.
- Area hit (`areaHit.ts`): the 0xDB follow-up is sent only for skills OpenMU types
  `AreaSkillExplicitHits` (or listed in `EXPLICIT_HIT_SKILLS`).

### Notes: attackTiming.ts
A swing sets `AttackTime = 1`; it adds one per 25 Hz tick whatever the clip's speed.
`CheckAttackTime(n)` is true once per swing when the counter passes `n`. The swing ends at 15 ticks
or when the clip reaches its hit key (`AnimationFrame >= 5`, ZzzCharacter.cpp:2755). The original
sends `SendHitRequest` on the click (ZzzInterface.cpp:3355), and so does this client unless the
server's `server.json` sets `heldHitRequest` (then the request is latched to the hit key so it lands
with the blow). A slow clip reaches the key after 15 ticks, so the limit only ends a
swing after the blow fired. `hitTickFor` gives the tick, `1 + key / playSpeed`, capped by the
clip's length:

| PlaySpeed | who | hit tick (key 5) | seconds |
|---|---|---|---|
| 0.25 | level-1 swordsman | 21.0 (> 15) | 0.84 |
| 0.36 | GM / ~30 attack speed | 14.9 | 0.60 |
| 0.60 | fist / mid-game speed | 9.3 | 0.37 |
| 1.00 | end-game speed | 6.0 | 0.24 |

### Notes: castTargets.ts
The skill table's target field is not enough (Soul Barrier reads `Explicit` but can go on
yourself; Swell Life reads `ImplicitParty` but always goes as `HeroKey`). The original's
`SendRequestMagic` key decides: the hero for self-only buffs, the selected party member or else
the hero for party buffs and heals, the selected object for everything else. Read by
`skillCastSystem` and `modules/skills/skillCasting.ts` (`isSelfCastable`).

### Notes: skillClips.ts
The original's `UseSkill*` switches, `Attack*` branches and `ReceiveMagic` ladders become one
lookup in `SKILL_CLIPS`, plus what a table cannot hold: the mount (never in a safe zone) and a
skill's own pick (`ClipPick`: Fire Breath by the map, the Rage Fighter party buffs by a coin toss;
`PoseClip`: Plasma Storm by the hands, Slash's odd swing). Read through
`modules/skills/skillCasting.ts` `chooseSkillAction`, used for the hero and remote casters.

### Notes: skillMovement.ts
Stop: every `UseSkill*` starts with `LetHeroStop()`, so a cast is never taken mid-stride. Step in:
Rage Fighter contact skills move the caster one tile short of the target and send
`InstantMoveRequest`; Beast Uppercut, Chain Drive and Dragon Slasher do it mid-clip, Killing Blow
and Occupy at cast start. Root: some clips hold the caster's facing. Rush moves its caster too, but
the server sends the new square.

## Depends on / used by
- uses: `anim/playSpeed.ts`, `interface/nameTags.ts`, skill and packet tables in
  `versions/shared`, `modules/pets` and `modules/skills/skillAliases` (baselined rule
  exceptions in `tools/checks/baselines/deps.json`).
- used by: `ecs/systems` (attack, skill cast, death, pet), `controllers/skills`,
  `modules/combat/net.ts`, `modules/skills/skillCasting.ts`, `app/lifecycle.ts`, skill files.

## Change it
- add a combat entry: copy `_template.ts` to `<name>.ts`. Keep its three parts in order: tuning
  constants in real units with a reason, module state with plain reader / command functions, and
  the exported `CombatLayer` wiring `update` / `reset`. Add it to `COMBAT_LAYERS` in `layers.ts`.
  If it needs a packet, expose a command for `attackSystem` / `skillCastSystem` to call.
- state only one skill has: give the skill file a `combat: { layer, hooks }`; add a slot to
  `skillHooks.ts` and a forwarding method on the facade if the systems must read it.
- a skill's clip, target, step-in or any other combat rule: set the field in its `defineSkill`.
- a new kind of per-skill rule: add the field to `SkillCombatRules` (and `SkillDef`), a table
  and a reader in the entry that uses it, and write it in `registerSkillRules`.
- a hit key: `HIT_KEYS` in `recipes.ts`.

## Tests
- `attackTiming.test.ts`: `blowHeldTicks` and its window, the clips that release a cast on their key.
- `playerTarget.test.ts`: who is a hostile player (Ctrl, outlaws, warning states, duels).
- `weaponRange.test.ts`: `ammoReload` puts arrows / bolts in the empty hand, reports an empty bag.
- `skillRules.test.ts`: `registerSkillRules` fills every table and the readers answer from them.
- The skill golden tests in `versions/shared/skills/` cover clips, targets and step-in per skill
  (`skillRules.golden.test.ts`, `castRules.test.ts`).
