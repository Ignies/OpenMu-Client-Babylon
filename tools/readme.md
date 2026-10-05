# tools

Scripts run by hand or by `package.json`, never by the game. Each file starts with what it does
and how to run it.

## Asset conversion (original `Data/` -> what the browser loads)
- `bmdToGlb.ts`: models (`.bmd`) to `public/game-assets/**.glb`; `shared.ts` names the source tree.
- `ozjToJpeg.ts`, `oztToTga.ts`, `pack-textures.ts`, `texturePacker.ts`: textures and sprite sheets.
- `copyData.ts`, `compressAssets.ts`, `assetsIndex.ts`: the production build's `dist/Data`, gzip
  sidecars and the pre-download index (`bun run build` runs all three).
- `instrumentModels.ts`, `instrumentSamples.ts`: the band system's instruments.

## Content generators (write files under `versions/` or `src/`)
- `convertItemTXTtoJson.ts`, `itemFiles.ts`, `syncItemRequirements.ts`, `addRageFighterColumn.ts`:
  the item files (`versions/shared/items/`).
- `monsterFiles.ts`, `buildMonsterHealth.ts`: the monster folders (`versions/shared/monsters/`).
- `itemIconFit.ts`, `itemIconManifest.ts`: the icon tables (`interface/item_icons/`, `assets/`).
- `configHexTable.ts`: `docs/configuration_hex.md`.

## Language packs and text
- `i18n.ts`: the translator's CSV, out of and back into the owners' `i18n/<code>.ts` files.
- `localPacks.ts`, `packTexts.ts`, `mapBanners.ts`, `questWords.ts`, `packs/`: the generated
  `Data/Local/<pack>/` language packs.

## Checks (`bun run check`, CI)
- `checks/`: structure checks and their baselines, the lint ratchet, the commit message rules
  ([docs/ci.md](../docs/ci.md)). `lintCounts.ts`: `bun run lint:count`. `checks/graph.test.ts`
  pins the cycle finder and the type-only import rule the cycle check stands on.
- `assetCase.ts`: the converted assets' file name case against the client's own tables.
- `weatherStats.ts`: what the proxy's weather schedule does, measured.

## Servers
- `sqliteBackup.ts`, `sqliteMigrate.ts`: backups and migrations of the services' databases.

## Codemods (`restructure/`)
- `move.ts`: move files and rewrite every import ([docs/how_to/move_files.md](../docs/how_to/move_files.md)).
- `facadeImports.ts`: route imports of a controller's subfolder through that folder's `index.ts`.
- `mergeImports.ts`: merge the duplicate imports a codemod leaves.
- `aliasImports.ts`, `dropUnusedImports.ts`, `deleteDeadExports.ts`: import and export cleanup.
- `commentsOnly.ts`: prove an edit changed comments only.
- `skillHomes.ts`, `checkHomes.ts`: where each skill id's file lives, and the check that it does.
