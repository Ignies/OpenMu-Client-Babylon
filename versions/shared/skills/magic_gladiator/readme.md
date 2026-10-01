# magic_gladiator

Magic Gladiator skills, one folder per skill. Rules for skill folders: [../readme.md](../readme.md).
MG strengtheners of skills another class owns sit with that skill (for example
`dark_knight/cyclone/strengthener_magic_gladiator.ts`, `dark_wizard/inferno/strengthener_magic_gladiator.ts`).

## Public API
- Each folder's default export is a `defineSkill`, found by glob in `../index.ts`.

## How it works

| Folder | Ids | Look |
|---|---|---|
| `fire_slash` | 55, 490 str | the wheel charge and a fire crescent; the skull is the debuff's look |
| `power_slash` | 56, 482 str | five hidden orbs fanned from -40 to +40 degrees |
| `spiral_slash` | 57 | five flare ribbons in two waves |
| `mana_rays` | 73 | the force beam at the Death Cannon clip's frame 3 |
| `flame_strike` | 236 | a blade on the weapon link bone with three blurs |
| `gigantic_storm` | 237 | five strike sites round the caster |

`_shared.ts` holds:
- `MG_EMBERS`: embers shed off Fire Slash's crescent;
- `mgSay`: a positionless combat sound; `mgSayOnBattleCastle`: the same, on the Battle Castle map only;
- `mgTurn`: turn toward an angle by at most a step; `mgGlint`: the shiny glint at the weapon on the hero's own cast.

## Depends on / used by
- uses: `../_shared.ts`, `@/controllers/{skills,fx,lighting,sound,combat}`
- used by: `../index.ts` (glob)

## Change it
- see [docs/how_to/add_skill.md](../../../../docs/how_to/add_skill.md).

## Tests
- Covered by the golden tests in `../` (`skillVisuals.golden.test.ts`, `skillTables.golden.test.ts`).
