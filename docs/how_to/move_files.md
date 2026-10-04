# Move files without breaking imports

1. Write the moves as JSON (file or folder, a specific file wins over its folder):

   ```json
   [{ "from": "src/controllers/old/thing.ts", "to": "src/modules/thing/thing.ts" }]
   ```

2. Dry run: `bun tools/restructure/move.ts moves.json --dry-run`. It lists config files that name
   the old path (vite, eslint, package.json, html) for you to fix by hand.
3. Run it without `--dry-run`. It renames the files and rewrites every import, dynamic import,
   `new URL(..., import.meta.url)` and `vi.mock` that pointed at them.
4. Less `@import` and paths inside strings are not rewritten: use the `@/` alias in Less, and grep
   for the old path.
5. `bun run tsc`, `bun run test`, `bun run check`. Commit the move alone.
6. Restart the dev server after a big move: a running Vite can keep two copies of a controller
   singleton, which shows up as unlit, black models until the page is reloaded from a fresh server.

## Move Store members to a module

`bun tools/restructure/storeSplit.ts map.json [--dry-run]` rewrites `Store.<member>` to its new home
and moves named imports of `app/store.ts` (types, enums) to the file that exports them now:

```json
{ "members": { "playerData": { "expr": "Hero", "name": "Hero", "door": "src/modules/hero/index.ts",
  "home": "src/modules/hero/state.ts" } },
  "exports": { "UIState": { "door": "src/app/uiState.ts" } } }
```

Files inside the home's folder import the home file, the rest the door. Move the member's code by
hand first; the tool also rewrites `this.<member>` left in the store class.
