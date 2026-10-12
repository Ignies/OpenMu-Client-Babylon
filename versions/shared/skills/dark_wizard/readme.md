# dark_wizard

Dark Wizard skills, one folder per skill. Rules for skill folders: [../readme.md](../readme.md).

## Public API
- Each folder's default export is a `defineSkill`, found by glob in `../index.ts`.
- `teleport/` exports `playTeleportFlash` (re-exported by `../skillVisuals.ts`). Soul Barrier's
  hit shell is its `buffHits[4]`.
- `nova/charge.ts`: `SKILL_NOVA`, `SKILL_NOVA_BEGIN`, `beginNova`, `releaseNova`, `novaCharge`,
  `novaStage`, `novaStageOf`, `novaCharging`, `novaChargeLayer` (the held-charge state the cast
  system drives through the Nova hook, which also names the two skill numbers). Nova's file holds
  its kill rule: the knock back and the blue death motes.
- `meteorite/` exports `dropMeteor` (a bare MODEL_FIRE and its landing, Dark Ghost's fire).
- `inferno/` exports `createInferno` (CreateInferno sub0) and `nova/` exports `circleSpirits` (MODEL_CIRCLE sub4's
  spirit heads), which the guardian bosses' rage draws (`../monsters/empire_guardian_rage/`).
- `_shared.ts` holds the Fire Ball trail and embers (Fire Ball, Meteorite); Poison, Ice, Power
  Wave, Energy Ball, Lance and Meteorite keep their own particle recipes.
- `ice/strengthener_magic_gladiator.ts` (489) and `ice/mastery_magic_gladiator.ts` (491) only
  say `castsAsSpell`.

## How it works

| Folder | Ids | Look |
|---|---|---|
| `poison` | 1, 384 str | poison cloud and smoke at the target's feet |
| `meteorite` | 2, 390 str, 394 mastery | a fire meteor falls on the target: chips and explosion |
| `lightning` | 3 | thunder bolt from the weapon bone to the target, re-rolled every 2 ticks |
| `fire_ball` | 4 | a fire ball flies from the caster, chips at the hit |
| `flame` | 5, 378, 483 | a column of fire tongues at the point with stone chips; Enhanced (ours): fire pillars out of molten rock around it |
| `teleport` | 6 | spark column at the old square and at the new one |
| `ice` | 7, 389 str | ice crystal and small shards at the target's feet |
| `twister` | 8 | a storm walks the caster's facing with smoke, bolts and stones |
| `evil_spirit` | 9 | four pairs of spirit ribbons homing round the caster; Enhanced (`swarm.ts`, ours): eight spirits orbiting the reach, a smoke trail and the screen shroud, one trail and shroud per caster at a time |
| `hellfire` | 10, 388 str | a leap; the ground circle opens when the wizard lands |
| `power_wave` | 11 | a wave sheet slides from the caster toward and past the target |
| `aqua_beam` | 12 | a laser beam along the facing |
| `cometfall` | 13, 382 str, 484 str (MG) | two blast comets on the cast point |
| `inferno` | 14, 381 str, 486 str (MG) | CreateInferno and the inferno model at the caster |
| `teleport_ally` | 15 | spark column at the target and at the caster |
| `soul_barrier` | 16, 403 str, 404 prof, 406 mastery | arrival glimmer; the ribbon knot is the buff's look |
| `energy_ball` | 17 | an energy ball flies from the caster, a spark pop at the target |
| `decay` | 38, 387 str | two MODEL_FIRE blasts on the cast point, decay smoke |
| `ice_storm` | 39, 391 str, 393 mastery | ten blizzard models on the cast point |
| `nova` | 40 release, 58 start, 392 str, 395 cast str | charge motes while held, then waves of spirit heads |
| `lance` | 45 | three spinning javelins home on the target |
| `expansion_of_wizardry` | 233, 380 str, 383 mastery | the swell-of-magic model at the caster, blue light |
| `earth_prison` | 495, 497 str | no original; a ring of ground stones |

"Enhanced" in a skill's comment is the graded look drawn on higher lighting tiers.

`_shared.ts` holds:
- teleport steps (`teleportColumn`, `teleportEnhanced`, `TELEPORT_LIGHT`);
- release timing (`atRelease`, `releaseSound`, `dw2AtAttackTime`, both on `onRelease`: AttackTime 15 or
  the cast clip's key 5, whichever comes first);
- fire ball flight and its light (`FireBallLook`, `fireBallFlight`, `FIRE_BALL_LIGHT`), lava chips,
  soft explosions and ground flares (`EXPLOSION_LIGHT`);
- small helpers: `perTickRoll`, `placeBodyLight`, `bearing`, `monsterOf`, `smallerSmoke`,
  `CLOAK_EFFECT`.

## Depends on / used by
- uses: `../_shared.ts`, `@/controllers/{skills,fx,lighting,sound,combat}`
- used by: `../index.ts` (glob); `nova/charge.ts` by the skill cast system

## Change it
- see [docs/how_to/add_skill.md](../../../../docs/how_to/add_skill.md).

## Tests
- Covered by the golden tests in `../` (`skillVisuals.golden.test.ts`, `skillTables.golden.test.ts`).
- `evil_spirit/index.test.ts`: Evil Spirit (and its master rows) flies four JOINT_SPIRIT pairs (widths 80
  and 20) homing on the caster, a MODEL_LASER skull on each wide one (`ZzzCharacter.cpp:4584-4604`); on Enhanced
  our swarm, trail and shroud, one trail and shroud per caster while they last.
