# monsters

Monsters that need their own model class, plus the monster tables. Every other monster is
drawn by the generic factory from `src/controllers/actors/monsterModelTable.ts`.

## Public API
- `MonstersDatabase.get(id)`: the `monsters.json` row for a monster number, or `null`.
- `monsterDisplayName(type, fallback?)`: the language pack's name (`NpcName_<Lang>.txt`), else
  the table name, else a placeholder.
- `monsterMaxHealth(type)`: max health from `monsterHealth.json`, or 0.
- `monsterFactoryFor(modelType, scale, hiddenMesh)`: a cached generic `MonsterObject` class.
- One class per special monster (below).

## How it works
- `monsterHealth.json` is built by `tools/buildMonsterHealth.ts` from the server's monster
  definitions. The server never sends monster health; the `HP` column of `monsters.json` is
  from an older version and is not used for the bar.
- Each class extends `MonsterObject` (or `PlayerObject`), takes its scale from
  `monsterScaleOf(npcType)` and loads its model in `init`. The comment at the top cites the
  original source.

| File | Monster(s) |
|---|---|
| `hound.ts`, `budge_dragon.ts`, `spider.ts` | Hound (1), Budge Dragon (2, bobs while walking), Spider (3) |
| `death_gorgon.ts` | Death Gorgon (35): the Gorgon at level 2, burning body |
| `balgass.ts` | Balgass (349), Crywolf boss |
| `kundun.ts` | Kundun (275), with a fast-forwarded death clip |
| `selupan.ts` | Selupan (459), Raklion boss |
| `blood_castle_gate.ts` | Castle Gate (131) and Statue of Saint (132-134) |
| `golden_monsters.ts` | the golden invasion line, with extra additive body passes |
| `skeleton_warrior.ts` | Skeleton Warrior, Archer, Elite, Death King, Death Bone: player-rig monsters |
| `generic_monster.ts` | the factory every other monster uses |

## Depends on / used by
- uses: `@/controllers/actors`, `@/controllers/assets`, `@/controllers/fx`, `@/i18n`
- used by: `src/controllers/actors/modelFactoryPerId.ts` (classes and factory),
  `src/app/logic.ts` (`monsterDisplayName`), `versions/<id>/tables`

## Change it
- give a monster its own look: add `<name>.ts` with a `MonsterObject` subclass, then map its
  npc type in `src/controllers/actors/modelFactoryPerId.ts`.
- refresh health: rerun `tools/buildMonsterHealth.ts`.

## Tests
- None in this folder.
