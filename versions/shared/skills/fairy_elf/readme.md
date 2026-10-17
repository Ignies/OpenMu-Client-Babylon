# fairy_elf

Fairy Elf skills, one folder per skill. Rules for skill folders: [../readme.md](../readme.md).

## Public API
- Each folder's default export is a `defineSkill`, found by glob in `../index.ts`.

## How it works

| Folder | Ids | Look |
|---|---|---|
| `triple_shot` | 24 | three arrows at +-15 degrees, the bow's own arrow (`launcherShot`) |
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
| `starfall` | 46 | the arrow impact model as the shot (whatever the bow), then again where it lands |
| `ice_arrow` | 51 | ice shards, smoke and an orbiting flame at the target; one arrow, the bow's own |
| `penetration` | 52 | a gathering charge on a ring of sparks, then a piercing arrow (the bow's own) |
| `infinity_arrow` | 77, 441 str | the original's rings (`rings.ts`): arrowsre02-04 at the feet and arrowsre05 growing on the hand, arrowsre01's flare joints homing on it and lighting the ground, the gold quiver while the buff holds (`actors/ammoGold.ts`, on both branches); Enhanced (ours): a blue flash with ice motes, and the same gold quiver |
| `recovery` | 234 | an impact flash at the caster, flare ribbons and a summon model on the target |
| `multi_shot` | 235 | six arrows (the bow's own, `launcherShot`) and the multi-shot muzzle volley |
| `cure` | 425 | a pale green holy circle |
| `party_healing` | 426, 429 str | a holy circle at the target and at the caster |
| `poison_arrow` | 427, 434 str | the bow's own arrow with a venom trail, venom hit |
| `bless` | 430, 433 str | a gold holy circle |
| `summon_satyros` | 432 | the summon circle |

The summon's own arrival is played from the create flag of the summoned monster
(`playSummonArrival` in `../_shared.ts`), not by these skills.

`_shared.ts` holds the elf summon cast: `elfSummon` (at the cast's release, `afterRelease`: the summon decal
and its healing streaks at the caster) and `SUMMON_GRADED` (the graded look used by ids 30-36);
`atBuffRelease`: Heal, Greater Defense and Greater Damage draw at the cast's release on the target as it
stands then (ZzzCharacter.cpp:4910-4954), with their `strike` light there. The arrows leave at the release
too (CreateArrows, ZzzCharacter.cpp:4811-4828, :4893-4909): Triple Shot's fan (`afterRelease`) and
Starfall's and Ice Arrow's shot (`travel.release`); Ice Arrow's ice forms on the target at the packet
(WSclient.cpp:4479-4500). Penetration's arrow leaves at AttackTime 5, its own `g_iLimitAttackTime`
(`{ clips: NO_KEY, limit: 5 }`, ZzzCharacter.cpp:2762-2780).

## Depends on / used by
- uses: `../_shared.ts`, `@/controllers/{skills,fx,lighting,sound,combat}`
- used by: `../index.ts` (glob)

## Change it
- see [docs/how_to/add_skill.md](../../../../docs/how_to/add_skill.md).

## Tests
- Covered by the golden tests in `../` (`skillVisuals.golden.test.ts`, `skillTables.golden.test.ts`);
  `../releaseTiming.test.ts` times the buffs against the caster's magic speed and the arrows against
  the bow clip's attack speed.
- `infinity_arrow/index.test.ts`: the original's rings on Classic, our flash and motes on Enhanced.
- `launcherArrows.test.ts`: Triple Shot, Multi-Shot, Penetration, Ice Arrow and Poison Arrow throw the arrow of the bow in hand;
  Starfall always the impact model
  (`items/launcher_arrows.ts`), the plain arrow with a wooden bow or none.
