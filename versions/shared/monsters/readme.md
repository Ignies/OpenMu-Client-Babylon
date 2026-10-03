# monsters

Every monster and NPC type, one folder each. A monster with its own look keeps its model class in
its folder.

```
<name>/index.ts       one type: export default defineMonster({ Numb, Name, maxHealth, model, stats })
<name>/model.ts       its own model class, registered with registerModelClass (client only)
_<line>/model.ts      a class family several types share (_golden_line, _skeleton_line, _blood_castle)
all.ts                finds every index.ts (glob in the client and tests, from disk in the Bun servers)
models.ts             loads every model.ts (client only; src/app/logic.ts imports it)
monstersDatabase.ts   MonstersDatabase.get, monsterDisplayName, monsterMaxHealth
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
- One model class per monster with its own look (below); every other monster is drawn by the
  actors controller's generic class from its folder's `model`.

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

| Model class | Monster(s) |
|---|---|
| `hound/`, `budge_dragon/`, `spider/` | Hound (1), Budge Dragon (2, bobs while walking), Spider (3) |
| `death_gorgon/` | Death Gorgon (35): the Gorgon at level 2, burning body |
| `balgass/` | Balgass (349), Crywolf boss |
| `kundun_demon/` | Kundun (275), with a fast-forwarded death clip |
| `selupan/` | Selupan (459), Raklion boss |
| `_blood_castle/` | Castle Gate (131) and Statue of Saint (132-134) |
| `_golden_line/` | the golden invasion line, with extra additive body passes |
| `_skeleton_line/` | Skeleton Warrior, Archer, Elite, Death King, Death Bone: player-rig monsters |

## Depends on / used by
- uses: the monsters controller, `@/controllers/actors`, `@/controllers/assets`, `@/controllers/fx`, `@/i18n`
- used by: the actors controller (models through the monsters controller, classes through
  `registerModelClass`), `src/app/logic.ts` (`monsterDisplayName`, `models.ts`), the gm feature,
  the proxy tracker (`all.ts`), `versions/<id>/tables`

## Change it
- change a monster's data: edit `<name>/index.ts`. A new type: a new folder.
- give a monster its own look: add `<name>/model.ts` with a `MonsterObject` subclass and
  `registerModelClass(<type>, Class)` at the bottom. Nothing else to touch.
- refresh health: rerun `tools/buildMonsterHealth.ts`.

## Tests
- `monsters.golden.test.ts`: the original table and the server health, unchanged (hashes); update
  them on purpose.
