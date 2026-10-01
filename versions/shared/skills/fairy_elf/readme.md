# fairy_elf

Fairy Elf skills, one folder per skill. Rules for skill folders: [../readme.md](../readme.md).

## Public API
- Each folder's default export is a `defineSkill`, found by glob in `../index.ts`.

## How it works

| Folder | Ids | Look |
|---|---|---|
| `triple_shot` | 24 | three arrows at +-15 degrees |
| `heal` | 26, 413 str | a magic circle at the target and healing streaks into it |
| `greater_defense` | 27, 417 str, 423 mastery | magic circle; the spear ribbons persist as a buff look |
| `greater_damage` | 28, 420 str, 422 mastery | magic circle at the target |
| `summon_goblin` | 30 | summon circle at the caster's feet with healing streaks |
| `summon_stone_golem` | 31 | same as 30 |
| `summon_assassin` | 32 | same as 30 |
| `summon_elite_yeti` | 33 | same as 30 |
| `summon_dark_knight` | 34 | same as 30 |
| `summon_bali` | 35 | same as 30 |
| `summon_soldier` | 36 | same as 30 |
| `starfall` | 46 | the arrow, then the arrow impact model where it lands |
| `ice_arrow` | 51 | ice shards, smoke and an orbiting flame at the target; one arrow |
| `penetration` | 52 | a gathering charge on a ring of sparks, then a piercing arrow |
| `infinity_arrow` | 77, 441 str | a blue flash; the aura persists as a buff look |
| `recovery` | 234 | an impact flash at the caster, flare ribbons and a summon model on the target |
| `multi_shot` | 235 | five arrows and the multi-shot muzzle volley |
| `cure` | 425 | a pale green holy circle |
| `party_healing` | 426, 429 str | a holy circle at the target and at the caster |
| `poison_arrow` | 427, 434 str | a nature arrow with a venom trail, venom hit |
| `bless` | 430, 433 str | a gold holy circle |
| `summon_satyros` | 432 | the summon circle |

The summon's own arrival is played from the create flag of the summoned monster
(`playSummonArrival` in `../_shared.ts`), not by these skills.

`_shared.ts` holds the elf summon cast: `elfSummon` (14 ticks after the packet, the summon decal
and its healing streaks at the caster) and `SUMMON_GRADED` (the graded look used by ids 30-36).

## Depends on / used by
- uses: `../_shared.ts`, `@/controllers/{skills,fx,lighting,sound,combat}`
- used by: `../index.ts` (glob)

## Change it
- see [docs/how_to/add_skill.md](../../../../docs/how_to/add_skill.md).

## Tests
- Covered by the golden tests in `../` (`skillVisuals.golden.test.ts`, `skillTables.golden.test.ts`).
