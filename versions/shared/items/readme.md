# items

The item table and the item-driven looks that are content, not controller code.

## Public API
- `ItemsDatabase.getItem(group, index)`: the `items.json` row for an item, or `null`.
- `itemBaseName(group, index)`: the name to print. The active language pack's name
  (`Local/<lang>/item_<lang>.bmd`) when it has one, else the English `ItemName`.
- `LAUNCHER_ARROWS`: arrow model and colour per bow or crossbow index (group 4).

## How it works
- `items.json` is the Season 6 `Item.txt` converted by `tools/convertItemTXTtoJson.ts`.
  `tools/addRageFighterColumn.ts` and `tools/syncItemRequirements.ts` run after it, since the
  converter rewrites the file from scratch.
- `itemsDatabase.ts` indexes the rows by `Group` then `Index` once, at import.
- `launcher_arrows.ts` is handed to the skills controller by `versions/shared/skills/index.ts`
  (`registerLauncherArrows`). A launcher with no row shoots the plain steel arrow.

## Depends on / used by
- uses: `@/controllers/assets/mu/itemNameFile`, `@/controllers/fx/recipes`
- used by: the Store, item grid / tooltip widgets, actors, drops, inventory, items, marketplace
  and quest features; `versions/<id>/tables` re-export `ItemsDatabase`

## Change it
- new item data: rerun `tools/convertItemTXTtoJson.ts`, then the two follow-up tools above.
- new launcher arrow: add a row to `LAUNCHER_ARROWS` keyed by the launcher's item index.

## Tests
- None in this folder.
