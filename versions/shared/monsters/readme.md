# monsters

Every monster and NPC type, one folder each, plus the model classes of the monsters that need
their own look.

```
<name>/index.ts       one type: export default defineMonster({ Numb, Name, maxHealth, stats })
all.ts                finds every folder (glob in the client and tests, from disk in the Bun servers)
monstersDatabase.ts   MonstersDatabase.get, monsterDisplayName, monsterMaxHealth
<class>.ts            model classes for monsters with their own look (table below)
```

A folder's name is the type's name in snake_case, plus `_<number>` when two types share a name
(the Blood Castle and Devil Square levels, the Aegis line...). NPCs are in here too: the original
table (`Monster.txt`) and the wire (`AddNpcsToScope`) number them the same way.

## Public API
- `MonstersDatabase.get(id)`: the original table's row for a type (`stats` with `Numb` and `Name`),
  or `null` for a type that table lacks.
- `monsterDisplayName(type, fallback?)`: the language pack's name (`NpcName_<Lang>.txt`), else
  the table name, else a placeholder.
- `monsterMaxHealth(type)`: the folder's `maxHealth`, or 0.
- `monsters` (`all.ts`): the registry itself, for server code (`all()`, `get`, `def`, `maxHealth`).
- `monsterFactoryFor(modelType, scale, hiddenMesh)`: a cached generic `MonsterObject` class.
- One class per special monster (below).

## How it works
- The monsters controller (`src/controllers/monsters`) owns the types (`MonsterDef`, `MonsterRow`),
  `defineMonster` and the registry.
- `stats` is the original client's table row; 103 types the server knows have no row and carry
  only a name (OpenMU's) and `maxHealth`.
- `maxHealth` is written by `tools/buildMonsterHealth.ts` from the server's monster definitions
  (through `tools/monsterFiles.ts`). The server never sends monster health; `stats.HP` is an
  older version's and is not used for the bar.
- Each model class extends `MonsterObject` (or `PlayerObject`), takes its scale from
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
- uses: the monsters controller, `@/controllers/actors`, `@/controllers/assets`, `@/controllers/fx`, `@/i18n`
- used by: `src/controllers/actors/modelFactoryPerId.ts` (classes and factory),
  `src/app/logic.ts` (`monsterDisplayName`), the gm feature, the proxy tracker (`all.ts`),
  `versions/<id>/tables`

## Change it
- change a monster's data: edit `<name>/index.ts`. A new type: a new folder.
- give a monster its own look: add a `MonsterObject` subclass, then map its npc type in
  `src/controllers/actors/modelFactoryPerId.ts`.
- refresh health: rerun `tools/buildMonsterHealth.ts`.

## Tests
- `monsters.golden.test.ts`: the original table and the server health, unchanged (hashes); update
  them on purpose.
