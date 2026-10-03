# monsters

The monsters controller: what a monster (or NPC) type is and where types are kept. Each type is
its own folder in `versions/shared/monsters/<name>/` and uses this controller.

## Public API
- `MonsterDef`: one type (`Numb`, `Name`, `maxHealth`, `stats`); `MonsterStats`: the original
  table's row; `MonsterRow`: that row with `Numb` and `Name`, as readers always got it.
- `defineMonster(def)`: a monster folder's default export.
- `MonsterRegistry`: `get(numb)` (the table row or null), `def(numb)`, `maxHealth(numb)`, `all()`,
  `add` (a later def with the same number replaces the earlier one, for a version's own folder).

## How it works
- Pure data, no engine imports, so the Bun servers use it too.
- The content side (`versions/shared/monsters/all.ts`) finds the folders and fills one registry.

## Tests
- `versions/shared/monsters/monsters.golden.test.ts` covers the registry with the real folders.
