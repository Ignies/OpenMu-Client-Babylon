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
row are named from `NpcName_Eng.txt`, and so are the ones whose row names someone else (244 is
Caren, not Lumen; 255 is Lumen; 258 is Luke, not Silvia; 229 is Marlon): the folder follows the
original client's name, the row keeps its own. The same goes for rows that name another monster
(290-294, the Chief Skeleton Warriors, Giant Ogres and Magic Skeletons, 151, 318, 400, 401, 430,
69): the folder follows `NpcName_Eng.txt` and `_enum.h`. So do the rows with a wrong or misspelt name:
80 is the Golden Lizard King and 81 the Golden Vepar, 79 the Golden Derkon, the Blood Castle "Orc
Warrior / Orc Archer / Spirit Soldier / Spirit Knight" rows are the Chief Skeleton Warriors and
Archers, Dark Skull Soldiers and Red Skeleton Knights, and 54, 61, 63, 67, 75 are the Golden
Soldier, (Death) Beam Knight, Metal Balrog and Great Drakan. 421 stays `werewolf_421`: `_enum.h`
calls it WEREWOLF2 and the client draws it with MODEL_WEREWOLF2 (GMNewTown.cpp:910); the
`NpcName_Eng.txt` lines 419-421 are shifted by one.

`Name` is the table row's name where there is a row. A type without one carries the original
client's name, the first `NpcName_Eng.txt` row for it (`Setting_Monster`, ZzzCharacter.cpp:13163-13171),
not the server's: the Imperial Fortress line (504-528) is Gaion Kharein, Jerint, Erkanne and so on,
the three spider eggs are all Spider Eggs. 419-421 keep the `_enum.h` reading, as their folders do.
In game the name a player reads is the language pack's in either case (`monsterDisplayName`).

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
  a name and `maxHealth`. Rows 434 (Gigantis) and 436 (Balram (Trainee)) came out of the old table's
  converter one column off, the level inside the quoted name and every stat a column up; they are
  read back into their columns (437's row, the same set, lines up with them). Their folder names
  still carry the level (`gigantis_98`, `balram_trainee_134`).
- `maxHealth` is written by `tools/buildMonsterHealth.ts` from the server's monster definitions
  (through `tools/monsterFiles.ts`, which only touches that line in an existing file). The server
  never sends monster health; `stats.HP` is an older version's and is not used for the bar.
- How a type is drawn, in the order the actors controller asks (`resolveModelFactory`):

| Field / file | Drawn as |
|---|---|
| `model.ts` | its own class |
| `hidden: true` | nothing (the Crywolf altars, Maya's body 364) |
| `trap: { object, shadow }` | the world object of the map it stands on (traps 100-106) |
| `model: { type, scale, hiddenMesh }` | monster model `Monster/Monster<type+1>.glb` |
| `npcModel: { file, scale?, clipSpeeds?, holdFrame?, idle? }` | `Data/NPC/<file>` (or a path off the asset root when it starts with `/`); `idle` is the clip roll its model case has in EtcStopAnimationSetting (ZzzCharacter.cpp:3546-3687), else `rand() % 2` |
| `gear: { charClass, set, mainHand, ... }` | a player rig in one armour set plus a kit |
| `transformed: { dir, part, scale? }` | a player rig whose body is one part file |
| none | the Bull Fighter, as the original's default |

- `classicShadow: false`: the original's shadow pass skips it (Ice Monster, Ice Queen, Red Dragon,
  Zaikan, Deathvim Knight, Elf Lala and the first Kalima gate, ZzzCharacter.cpp:8662-8668); no trap
  (100-110) casts one either; nor what its case creates with `m_bRenderShadow = false` (the Raklion spider
  eggs, the Castle Siege pieces, the Empire Guardian gates and statue, the Doppelganger, the Gateway
  Machine, Elpis, Natasha, the Gatekeeper, the cherry blossom tree, the Cursed Temple statue, Queen
  Rainer). `classicShadow: 'alive'`: dropped when it dies (the Transformed Snowman; the bodies'
  own in `monster_models/`). The cascades still take them.
- A scale is written only where the original's case sets one; without it the type spawns at 0.9,
  CreateCharacterPointer's default (ZzzCharacter.cpp:11699), as do the classes that set none.
  `npcModel.clipSpeeds` are the `Models[].Actions[].PlaySpeed` a case writes (Moss and Zyro, 0.33);
  the animation system reads them through the model's `actionPlaySpeed`. `npcModel.holdFrame` draws
  it still on that key of clip 0 and never runs a clip: the Kalima gates (152-158) spawn on frame 10,
  play to the clip's end and stay on frame 8 (ZzzCharacter.cpp:13326-13334, :3504-3506, :3737-3740),
  but `BMD::Animation` blends the prior key into the current one by the fraction (ZzzBMD.cpp:146-149,
  :259-264): the prior key stays 10 and 8.0 has none, so key 10, the doors open at 90 degrees, is all
  the original ever shows. Ours hold key 10 (the converter keeps it, `tools/bmdKeys.ts`).

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
| `kundun_demon/` | Kundun (275), with a fast-forwarded death clip and chrome on meshes 1-6 |
| `selupan/` | Selupan (459), Raklion boss; his 0x69 looks are `skills/monsters/selupan/` |
| `gayion_the_gladiator/` | Gaion Kharein (504), Imperial Guardian boss: his five swords on their bones by action (`swords.ts`), mesh 2 bright blue and the jewel and edge sprites on each sword's bones, and the swords his attacks throw at the hero (`flights.ts` paths, `thrown.ts`: SubType 1 and 3 flights, the curved swords' shadows, the blue ground light, the throw sounds). Not ported: Attack2's sword-force trails, fire and thunder joints; Attack3's flare joint and landing (crater, stones, shock waves, quake, sounds); the SubType 11 / 12 return to the hand; Attack4's main sword and flame strike. His Berserker's rage (CreateInferno and two MODEL_CIRCLE sub4) is `skills/monsters/empire_guardian_rage/`, as for the other seven guardian bosses. His 0x69 skills pick Attack1-4 and the Berserker's Appear (`controllers/anim/monsterAttackClip.ts`, GMEmpireGuardian4.cpp:1399-1440) |
| `_blood_castle/` | Castle Gate (131) and Statue of Saint (132-134) |
| `_golden_line/` | the golden invasion line, with extra additive body passes |
| `_skeleton_line/` | Skeleton Warrior, Archer, Elite, Death King, Death Bone: player-rig monsters |
| `amy_potion_girl/`, `lumen_the_barmaid/`, `_merchant_men/` | rig-only models with head / upper / lower parts (253, 255; Alex 230, Martin 248, Harold 250) |
| `elf_soldier/` | Elf Soldier (257): an always-flying Fairy Elf |
| `golden_archer/`, `_plate_npc/` | player-rig NPCs in a fixed armour set (236; Luke 258, Leo 371, Ellen 414) |
| `_archangels/` | Archangel (232) and Messenger of Archangel (233): bright mesh, ground halo, feathers |

A folder with both a `model.ts` and an `npcModel` draws with the class; the row is what the NPC
tables list. A plain NPC model at a fixed scale needs no class: `npcModel` is enough.

## Depends on / used by
- uses: the monsters controller, `@/controllers/actors`, `@/controllers/assets`, `@/controllers/fx`,
  `@/controllers/anim`, `@/core/types`, `../objects/enum`, `@/i18n`
- used by: the actors controller (data through the monsters controller, classes through
  `registerModelClass`), the sound controller (`voice`, `globalVoice`), `src/app/logic.ts`
  (`monsterDisplayName`), `src/app/boot.tsx` (`models.ts`), the gm module, the proxy tracker
  (`all.ts`), `versions/<id>/tables`

## Change it
- change a monster's or an NPC's data, look or voice: edit `<name>/index.ts`. A new type: a new folder.
- give a type its own look: add `<name>/model.ts` with a class and `registerModelClass(<type>, Class)`
  at the bottom. Nothing else to touch.
- refresh health: rerun `tools/buildMonsterHealth.ts`.

## Tests
- `monsters.golden.test.ts`: the original table and the server health, unchanged (hashes); update
  them on purpose.
- `names.test.ts`: no name holds a level or a stray quote, and rows 434 and 436 sit in their columns;
  a type without a table row has the original client's name (checked against `NpcName_Eng.txt` when
  `Data/` is there).
- `models.test.ts`: every registration names a class its file defines; the set of types with a
  class of their own.
- `bossVisuals.test.ts`: the bosses' `RenderMonsterVisual` rows (cards, ribbons, smokes) as their
  map files write them: Medusa, Kundun, Selupan, Erohim, Balgass, Nightmare.
- `src/controllers/actors/resolveModel.golden.test.ts`: what every type 0..600 is drawn with, and
  the NPC tables; `src/controllers/sound/npcVoices.test.ts`: the voices.
