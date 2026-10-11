# items

Every item, one file each, plus the item-driven looks that are content, not controller code.

```
<group>/<item>.ts     one item: export default defineItem({ Group, Index, ItemName, X, Y, ... })
  swords axes maces spears bows staffs shields helms armors pants gloves boots
  wings helpers potions misc        (item groups 0-15, in order)
all.ts                finds every item file (glob in the client and tests, from disk in the Bun servers)
itemsDatabase.ts      ItemsDatabase.getItem / all, itemBaseName
launcher_arrows.ts    arrow model and colour per bow or crossbow index
petItems.ts           pet and mount item numbers in group 13 (PET_GROUP, DARK_HORSE, ...)
```

## Public API
- `ItemsDatabase.getItem(group, index)`: the item's record, or `null`. `ItemsDatabase.all()`: every
  item in (group, index) order.
- `itemBaseName(group, index)`: the name to print. The active language pack's name
  (`Local/<lang>/item_<lang>.bmd`) when it has one, else the English `ItemName`.
- `items` (`all.ts`): the registry itself, for server code (`items.all()`, `items.get(g, i)`).
- `LAUNCHER_ARROWS`: arrow model and colour per bow or crossbow index (group 4).
- `petItems.ts`: `PET_GROUP` and the pet, mount and follower item numbers. Pure data, read by the item
  rules, the actors controller, the pets module and maps (it was `modules/pets/petConstants.ts`).

## How it works
- The items controller (`src/controllers/items`) owns the record type (`ItemRecord`), `defineItem`
  and the registry. Field names are the original table's, so every reader keeps working.
- The files came from the Season 6 `Item.txt`: `tools/convertItemTXTtoJson.ts` writes them,
  `tools/addRageFighterColumn.ts` and `tools/syncItemRequirements.ts` run after it (all three go
  through `tools/itemFiles.ts`), then `tools/syncItemClasses.ts` sets every class block and the
  `TwoHand` flag (written only where it is 1) to the original `Item_eng.bmd`'s
  (`item_rules/itemClasses.test.ts` and `actors/weaponClass.test.ts` check each row). A file's name is the item's name in snake_case, plus `_<index>`
  when two items of a group share a name.
- `szModelFolder` + `szModelName` is the model the original loads for the item (`ZzzOpenData.cpp`
  `AccessModel`), where `Item.txt` names a later season's file: Merlin Staff is `Item/Staff_33`
  (`:1116`), not `summonsprit`; the Queen set (index 53) is `Player/<Part>Male54` (`:268-280`), not
  `<Part>Mail_succubus`. The converter keeps these names on a rerun. Every one must be converted
  (`tools/assetCase.test.ts`). For a new item it has no model for, the converter writes
  `Item/rollofpaper.glb` (`tools/convertItemTXTtoJson.ts`), the scrolls' own model: the seed spheres
  12/101-129 kept that stand-in until they took their level's `s30_sphere0<level + 1>`
  (ZzzOpenData.cpp:871-875), the fireworks (14/63) until `GM01` and the compressed Bless and Soul
  (12/30, 12/31) until `Jewel01` / `Jewel02` (:957-958, :984).
- `launcher_arrows.ts` is handed to the skills controller by `versions/shared/skills/index.ts`
  (`registerLauncherArrows`). A launcher with no row shoots the plain steel arrow.

## Depends on / used by
- uses: the items controller, `@/controllers/assets/mu/itemNameFile`, `@/controllers/fx/recipes`
- used by: `inventory`, `npc_shop`, item grid / tooltip widgets, actors, drops, inventory, items, marketplace,
  quest and gm modules; the cash shop, marketplace audit and proxy tracker read `all.ts`

## Change it
- change an item: edit its file. Add one: add a file in its group folder.
- regenerate from a new `Item.txt`: `tools/convertItemTXTtoJson.ts`, then the three follow-up tools.
- new launcher arrow: add a row to `LAUNCHER_ARROWS` keyed by the launcher's item index.

## Tests
- `items.golden.test.ts`: every item, unchanged (a hash of the whole list); update it on purpose. The
  seed spheres' models by level.
