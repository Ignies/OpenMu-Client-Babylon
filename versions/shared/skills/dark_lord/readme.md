# dark_lord

Dark Lord skills, one folder per skill. Rules for skill folders: [../readme.md](../readme.md).

## Public API
- Each folder's default export is a `defineSkill`, found by glob in `../index.ts`.

## How it works

| Folder | Ids | Look |
|---|---|---|
| `force` | 60 | at the strike key: rings, streaks and a lance from the caster |
| `force_wave` | 66, 509 str | same as Force |
| `fire_burst` | 61, 508 str, 514 mastery | three homing darts with ghost trails, starburst cards at the caster |
| `earthshake` | 62, 512 str, 516 mastery | on the Dark Horse: shock rings, ground stones, a burst and crack chains |
| `summon` | 63 | party teleport: blue light in the hand, then a circle and its light |
| `increase_critical_damage` | 64, 511 / 515 / 517 power ups | a skill model at each weapon bone; the lasting look is a buff look |
| `electric_spike` | 65, 519 str | a gathering charge, five flare force joints, skill models at the weapon |
| `abolish_magic` | 72 | six bands spiral in on the caster, rise and burst out, four shock waves |
| `fire_blast` | 74 | a hidden homing piece drops six inferno pillars on the target |
| `brand_of_skill` | 75 | at the release, white skill models at (45, +-45, 0) on Weapon[0]'s and Weapon[1]'s link bones (none at arrows, bolts or a shield) and MODEL_MANA_RUNE 300 cm above: hidden, then the rune growing to 1, textured blue (0.3, 0.6, 1) with a chrome pass, a bright sub1 copy (ring and rune) each tick it holds at 1, then collapsing and sinking; sCDarkAssist in Battle Castle only, the one map that loads it (MapManager.cpp:283) |
| `fire_scream` | 78, 518 str, 520 mastery | three pairs of dark scream models, ground streaks, puffs and flames |
| `chaotic_diseier` | 238 | dark stars on the body, eight dark ribbons with birds, feathers and smoke |
| `iron_defense` | 521, 524 str | `IRON_DEFENSE` from `../_shared.ts`: nothing in Classic |

"Enhanced" in a skill's comment is the graded look drawn on higher lighting tiers.

`_shared.ts` holds:
- strike timing: `strikeKey` (`onRelease` with `{ key: 3, clips: STRIKE_CLIPS }`: the strike clip's key 3
  or 14 ticks after the packet, AttackStage ZzzCharacter.cpp:2865-2883),
  `litStrike`, `atFrame`, `everyTick`, `movesAt`, `ticksLeft`;
- Force parts: `force`, `forceGraded`, `forceHeads`, `hummingDir`;
- `SPLIT_EMBERS`, `sfx`;
- angle helpers: `yawDegrees`, `sideOf`, `forwardOfDeg`, `muYaw`, `muRotated`, `muAngle`;
- the hand cards: `cardHands` (Weapon[0] = the appearance's left hand on bone 33, Weapon[1] = its right hand on 42, with
  the skips) and `handCard` (MODEL_DARKLORD_SKILL at (45, +-45, 0), Scale 0.2, 10 ticks, in a Light): Add Critical and Brand of Skill;
- `MOUNTED_STRIKE`: the strike clip per mount.

## Depends on / used by
- uses: `../_shared.ts`, `@/controllers/{skills,fx,lighting,sound,combat}`, `actors` (the hand bones and item groups)
- used by: `../index.ts` (glob)

## Change it
- see [docs/how_to/add_skill.md](../../../../docs/how_to/add_skill.md).

## Tests
- `hand_cards.test.ts`: the MODEL_DARKLORD_SKILL cards of the hand skills, on Weapon[0]'s bone 33 and Weapon[1]'s bone 42
  (the appearance's left and right hand), with their skips; Brand of Skill's mana rune: its look, its Scale, Alpha and
  sinking a move, and its sub1 copies; its sound, in Battle Castle only.
- Covered by the golden tests in `../` (`skillVisuals.golden.test.ts`, `skillTables.golden.test.ts`).
