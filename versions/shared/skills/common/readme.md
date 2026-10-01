# common

Skills every class or no class has (scrolls, items, Fenrir), plus the buff looks no skill owns.
Rules for skill folders: [../readme.md](../readme.md).

## Public API
- Each folder's default export is a `defineSkill`, found by glob in `../index.ts`.
- `buff_looks.ts`: a default `defineBuffLooks` for buffs no skill owns. Registered by `../index.ts`
  (`registerBuffLooks`), not by the glob.

## How it works

| Folder | Ids | Look |
|---|---|---|
| `improve_ag` | 53 | four healing ribbons spiralling up round the body |
| `stun` | 67 | a flash joint at the caster |
| `cancel_stun` | 68 | a flash ribbon dropping from the sky onto the target |
| `swell_mana` | 69 | a fan of 36 spirit joints and a magic circle |
| `invisibility` | 70 | a magic circle at the target, light on random bones |
| `cancel_invisibility` | 71 | the same falling flash ribbon as 68 |
| `plasma_storm` | 76 | Fenrir: homing thunder into the rider and nearby monsters, coils above |
| `spell_of_protection` | 210 | a blue flash |
| `spell_of_restriction` | 211 | a dark flare flash |
| `spell_of_pursuit` | 212 | an eye flash |
| `shield_burn` | 213 | a red flash and blood chips |
| `iron_defense` | 323 | `IRON_DEFENSE` from `../_shared.ts`: nothing in Classic |

`buff_looks.ts`: the three seals (29-31) as pink ribbons round the legs, and the Freeze ice shell (57).

`_shared.ts` holds `flashDrop(colour)`: the falling flash ribbon of 68 and 71.

## Depends on / used by
- uses: `../_shared.ts`, `@/controllers/{skills,fx,lighting,sound,combat}`
- used by: `../index.ts` (glob, and `buff_looks.ts` directly)

## Change it
- see [docs/how_to/add_skill.md](../../../../docs/how_to/add_skill.md).
- a buff look no skill owns: add a row to `buff_looks.ts`.

## Tests
- Covered by the golden tests in `../` (`skillVisuals.golden.test.ts`, `skillTables.golden.test.ts`).
