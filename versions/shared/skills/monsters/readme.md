# monsters

Skills only monsters cast. Rules for skill folders: [../readme.md](../readme.md).

## Public API
- Each folder's default export is a `defineSkill`, found by glob in `../index.ts`, or a `defineMonsterSkill`
  (the looks a monster's map hook draws for its 0x69 skill, `ATMON_SKILL_*`, and its AttackEffectMonster after a swing).

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
| `empire_guardian_rage` | 0x69 59 | the eight guardian bosses' Berserker: CreateInferno and two MODEL_CIRCLE sub4 once, while the rage flag is up |
| `selupan` | 0x69 38-42, Raklion | his words (38, 40), the cure (39: rising flares, two Scale 8 ground glyphs) and the storm (42: boswind with clouds, ground bolts and stones, the summon circle). His height reset on a swing (GM_Raklion.cpp:2464-2468) is not ported: we never raise him to 1000 cm (the Raklion event state) |
| `dark_ghost` | swings and 0x19 casts, Empire Guardian 2 | AttackEffectMonster: a meteor on the target in Attack1, a flame column on it for a kept 51, a rain of 14 meteors for a kept 52 (which its plain swings keep, as in the original) |

OpenMU's generic monster skill (150) is drawn as 50 through `flame_of_evil`'s `lookAliases`.
`flame_of_evil` also owns the boss lights (meteor, blast, hellfire circle, laser).

`_shared.ts`: `destroyDefense`, the `cancel` of 201 and 202. ReceiveMagicFinish runs SetActionDestroy_Def
(GMHellas.cpp:740-755) before it drops their buff: a monster's Soul Barrier, else its Defense, breaks
off too, with a crystal burst and eHitCristal on the bodies RenderDestroy_Def draws (MODEL_SHRIKER,
MODEL_DEATH_CENTURION at SubType 9). The burst is scattered over the body, not read off mesh 6.

## Depends on / used by
- uses: `../_shared.ts`, `@/controllers/{skills,fx,lighting,sound,combat}`
- used by: `../index.ts` (glob)

## Change it
- see [docs/how_to/add_skill.md](../../../../docs/how_to/add_skill.md).

## Tests
- Covered by the golden tests in `../` (`skillVisuals.golden.test.ts`, `skillTables.golden.test.ts`).
- `immunity.test.ts`: what 201 / 202 cancels drop and when they burst.
