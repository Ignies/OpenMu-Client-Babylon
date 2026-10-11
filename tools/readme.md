# tools

Scripts run by hand or by `package.json`, never by the game. Each file starts with what it does
and how to run it.

## Asset conversion (original `Data/` -> what the browser loads)
- `bmdToGlb.ts`: models (`.bmd`) to `public/game-assets/**.glb`; `shared.ts` names the source tree
  (`MU_DATA`, `GLB_OUTPUT` for another version's tree: convert into a scratch folder and keep only
  what differs from Season 6's, `versions/v097d/readme.md`). A `LockPositions` action drops its last
  key, a loop-closing copy of key 0, unless the original clears the flag at load (`bmdKeys.ts`: the
  Kalima gate, `bmdKeys.test.ts`).
- `ozjToJpeg.ts`, `oztToTga.ts`, `pack-textures.ts`, `texturePacker.ts`: textures and sprite sheets.
- `copyData.ts`, `compressAssets.ts`, `assetsIndex.ts`: the production build's `dist/Data`, gzip
  sidecars and the pre-download indexes (`bun run build` runs all three). `assetsIndex.ts` writes
  one per version (`assets-index.json`, `assets-index-v097d.json`): a borrowing version lists each
  file at the url the client's own resolvers read it from, so a file is counted once, and offers
  only the map groups of the version's `data.worlds` (`assetsIndex.test.ts`); a world folder counts
  in any case (`Data/world55` is World55), so a lower-case one is never core.
- `instrumentModels.ts`, `instrumentSamples.ts`: the band system's instruments.

## Content generators (write files under `versions/` or `src/`)
- `convertItemTXTtoJson.ts`, `itemFiles.ts`, `syncItemRequirements.ts`, `addRageFighterColumn.ts`,
  `syncItemClasses.ts`: the item files (`versions/shared/items/`).
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
- `checks/distLogs.ts`: `bun tools/checks/distLogs.ts [dist]` after a build fails on any `console.log` /
  `console.debug` / `console.trace` call left in the bundle (vite.config.ts strips them, `esbuild.pure`;
  warnings, errors and info stay). `checks/productionLogs.test.ts` checks the config itself, no build needed.
- `assetCase.ts`: the converted assets' file name case against the client's own tables (a
  version's own-file list, `versions/<id>/data/assets.ts`, names files and is not scanned).
- `weatherStats.ts`: what the proxy's weather schedule does, measured.

## Servers
- `sqliteBackup.ts`, `sqliteMigrate.ts`: backups and migrations of the services' databases.
- `modules/sign.ts`: the owner's key pair and the signature that makes a streamed module first party
  (`keygen`, `pubkey`, `sign`; the key file stays outside the repository, `sign.test.ts` uses
  throwaway keys made in memory). Why and the steps: [docs/module_streaming.md](../docs/module_streaming.md).
- `modules/example/`: the example streamed module (`index.ts`) and `build.ts`, which bundles it to one
  file (`bun tools/modules/example/build.ts <out.js>`); `example.test.ts` streams that file signed and not.

## Codemods (`restructure/`)
- `move.ts`: move files and rewrite every import ([docs/how_to/move_files.md](../docs/how_to/move_files.md)).
- `facadeImports.ts`: route imports of a controller's subfolder through that folder's `index.ts`.
- `mergeImports.ts`: merge the duplicate imports a codemod leaves.
- `aliasImports.ts`, `dropUnusedImports.ts`, `deleteDeadExports.ts`: import and export cleanup.
- `commentsOnly.ts`: prove an edit changed comments only.
- `skillHomes.ts`, `checkHomes.ts`: where each skill id's file lives, and the check that it does.
