# monsters

Skills only monsters cast. Rules for skill folders: [../readme.md](../readme.md).

## Public API
- Each folder's default export is a `defineSkill`, found by glob in `../index.ts`.

## How it works

| Folder | Ids | Look |
|---|---|---|
| `flame_of_evil` | 50 | the boss skill: the caster's own per-monster attack effect on ticks 1-14 |
| `explosion` | 79 | a fire hit and a fire shock ring |
| `summon_monster` | 200 | a monster calls reinforcements: the summon circle |
| `magic_attack_immunity` | 201 | a soft shiny flash |
| `physical_attack_immunity` | 202 | a gold shiny flash |
| `potion_of_bless` | 203 | a holy flash and motes |
| `potion_of_soul` | 204 | a soul-coloured flash and motes |
| `doppelganger_self_explosion` | 239 | a fire hit and a wider fire shock ring |

OpenMU's generic monster skill (150) is drawn as 50 through `MASTER_ALIASES` in
`src/controllers/skills/visuals.ts`.

There is no `_shared.ts` in this folder.

## Depends on / used by
- uses: `../_shared.ts`, `@/controllers/{skills,fx,lighting,sound,combat}`
- used by: `../index.ts` (glob)

## Change it
- see [docs/how_to/add_skill.md](../../../../docs/how_to/add_skill.md).

## Tests
- Covered by the golden tests in `../` (`skillVisuals.golden.test.ts`, `skillTables.golden.test.ts`).
