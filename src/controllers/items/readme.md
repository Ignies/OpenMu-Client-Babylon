# items

The items controller: what an item is and where items are kept. Each item is its own file in
`versions/shared/items/<group>/` and uses this controller.

## Public API
- `ItemRecord`: one item, with the original item table's field names (`Group`, `Index`, `ItemName`,
  `X`, `Y`, requirements, class columns, `szModelFolder` / `szModelName`, ...).
- `defineItem(record)`: an item file's default export.
- `ItemRegistry`: items by group and index (`get`, `all` in (group, index) order, `add`, where a
  later item with the same key replaces the earlier one, for a version's own file).

## How it works
- Pure data, no engine imports, so the Bun servers use it too.
- The content side (`versions/shared/items/all.ts`) finds the files and fills one registry.

## Change it
- a new field on every item: add it to `ItemRecord` (optional), then to the files that have it.

## Tests
- `versions/shared/items/items.golden.test.ts` covers the registry with the real item files.
