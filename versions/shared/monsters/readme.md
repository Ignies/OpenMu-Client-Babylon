# monsters

Every monster and NPC type, one folder each. A type with its own look keeps its model class in its
folder; reworking a monster or an NPC is editing that folder.

```
<name>/index.ts       one type: export default defineMonster({ Numb, Name, maxHealth, model, ..., stats })
<name>/model.ts       its own model class, registered with registerModelClass (client only)
_<line>/model.ts      a class several types share (_golden_line, _skeleton_line, _blood_castle,
                      _plate_npc, _merchant_men)
all.ts                finds every index.ts (glob in the client and tests, from disk in the Bun servers)
models.ts             loads every model.ts (client only; src/app/boot.tsx imports it)
monstersDatabase.ts   MonstersDatabase.get, monsterDisplayName, monsterMaxHealth
```

A folder's name is the type's name in snake_case, plus `_<number>` when two types share a name
(the Blood Castle and Devil Square levels, the Aegis line...). NPCs are in here too: the original
table (`Monster.txt`) and the wire (`AddNpcsToScope`) number them the same way. NPCs without a table
row are named from `NpcName_Eng.txt`.

## Public API
- `MonstersDatabase.get(id)`: the original table's row for a type (`stats` with `Numb` and `Name`),
  or `null` for a type that table lacks.
- `monsterDisplayName(type, fallback?)`: the language pack's name (`NpcName_<Lang>.txt`), else
  the table name, else a placeholder.
- `monsterMaxHealth(type)`: the folder's `maxHealth`, or 0.
- `monsters` (`all.ts`): the registry itself, for server code (`all()`, `get`, `def`, `maxHealth`).
- One model class per type with its own look (below); every other type is drawn by one of the
  actors controller's generic classes from its folder's data.

## How it works
- The monsters controller (`src/controllers/monsters`) owns the types (`MonsterDef`, `MonsterRow`,
  the `Npc*` field types), `defineMonster` and the registry. Every field is pure data.
- `stats` is the original client's table row; the types the server knows without a row carry only
  a name and `maxHealth`.
- `maxHealth` is written by `tools/buildMonsterHealth.ts` from the server's monster definitions
  (through `tools/monsterFiles.ts`, which only touches that line in an existing file). The server
  never sends monster health; `stats.HP` is an older version's and is not used for the bar.
- How a type is drawn, in the order the actors controller asks (`resolveModelFactory`):

| Field / file | Drawn as |
|---|---|
| `model.ts` | its own class |
| `hidden: true` | nothing (the Crywolf altars) |
| `trap: { object, shadow }` | the world object of the map it stands on (traps 100-106) |
| `model: { type, scale, hiddenMesh }` | monster model `Monster/Monster<type+1>.glb` |
| `npcModel: { file, scale }` | `Data/NPC/<file>` (or a path off the asset root when it starts with `/`) |
| `gear: { charClass, set, mainHand, ... }` | a player rig in one armour set plus a kit |
| `transformed: { dir, part, scale }` | a player rig whose body is one part file |
| none | the Bull Fighter, as the original's default |

- What it sounds like, besides its monster body's voices: `voice` (a town noise,
  `MoveCharacterVisual`) and `globalVoice` (`PlayMonsterSoundGlobal`, also heard from a player
  wearing it as a skin). The sound controller reads them (`npcVoices.ts`).
- Each model class extends `MonsterObject`, `PlayerObject` or `ModelObject` (all from
  `@/controllers/actors`) and loads its model in `init`. The comment at the top cites the source.

| Model class | Type(s) |
|---|---|
| `hound/`, `budge_dragon/`, `spider/` | Hound (1), Budge Dragon (2, bobs while walking), Spider (3) |
| `death_gorgon/` | Death Gorgon (35): the Gorgon at level 2, burning body |
| `balgass/` | Balgass (349), Crywolf boss |
| `kundun_demon/` | Kundun (275), with a fast-forwarded death clip |
| `selupan/` | Selupan (459), Raklion boss |
| `_blood_castle/` | Castle Gate (131) and Statue of Saint (132-134) |
| `_golden_line/` | the golden invasion line, with extra additive body passes |
| `_skeleton_line/` | Skeleton Warrior, Archer, Elite, Death King, Death Bone: player-rig monsters |
| `trainer/`, `baz_storage_guard/`, `hanzo_blacksmith/`, `pasi_wizard/`, `wandering_merchant_zyro/` | single-model NPCs (226, 240, 251, 254, 568) |
| `amy_potion_girl/`, `liaman_barmaid/`, `_merchant_men/` | rig-only models with head / upper / lower parts (253, 255; Alex 230, Martin 248, Harold 250) |
| `elf_soldier/` | Elf Soldier (257): an always-flying Fairy Elf |
| `golden_archer/`, `leo_the_helper/`, `_plate_npc/` | player-rig NPCs in a fixed armour set (236, 371; 34, 258, 414) |
| `../npcs/archangel.ts` | the archangels (232, 233), until the fx door exports `TerrainDecal` |

A folder with both a `model.ts` and an `npcModel` draws with the class; the row is what the NPC
tables list (Hanzo's 0.95 there is not applied: his class draws at 1).

## Depends on / used by
- uses: the monsters controller, `@/controllers/actors`, `@/controllers/assets`, `@/controllers/fx`,
  `@/controllers/anim`, `@/core/types`, `../objects/enum`, `@/i18n`
- used by: the actors controller (data through the monsters controller, classes through
  `registerModelClass`), the sound controller (`voice`, `globalVoice`), `src/app/logic.ts`
  (`monsterDisplayName`), `src/app/boot.tsx` (`models.ts`), the gm feature, the proxy tracker
  (`all.ts`), `versions/<id>/tables`

## Change it
- change a monster's or an NPC's data, look or voice: edit `<name>/index.ts`. A new type: a new folder.
- give a type its own look: add `<name>/model.ts` with a class and `registerModelClass(<type>, Class)`
  at the bottom. Nothing else to touch.
- refresh health: rerun `tools/buildMonsterHealth.ts`.

## Tests
- `monsters.golden.test.ts`: the original table and the server health, unchanged (hashes); update
  them on purpose.
- `models.test.ts`: every registration names a class its file defines; the set of types with a
  class of their own.
- `src/controllers/actors/resolveModel.golden.test.ts`: what every type 0..600 is drawn with, and
  the NPC tables; `src/controllers/sound/npcVoices.test.ts`: the voices.
