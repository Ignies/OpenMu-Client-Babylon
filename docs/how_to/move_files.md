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

## After a codemod

- A file that moved into a controller's subfolder is private there: route outside imports through
  the folder's `index.ts` with `bun tools/restructure/facadeImports.ts <controller>`.
- `bun tools/restructure/mergeImports.ts` merges the duplicate imports a rewrite leaves behind.
- `bun run check` also fails on a new import cycle; see
  [code_style.md](../guidelines/code_style.md) for how to break one.
