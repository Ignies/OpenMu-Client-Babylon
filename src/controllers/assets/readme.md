# assets

Getting game files into the client: the two data roots, fetching with gzip sidecars, the glTF
model cache and item materials, texture packs, the pre-game download, the item icon pack, the BMD
reader (`bmd/`) and the readers for the original `Data/` tree (`mu/`). There is no `index.ts`;
other folders import the modules below directly.

## Public API
- Data roots: `resolveUrlToDataFolder(url)` (converted assets, `gameVersion.data.assets`);
  `mu/dataFolder.ts`: `resolveDataUrl`, `downloadDataFile`, `hasDataFile` (the original `Data/`
  tree, `gameVersion.data.folder`).
- `download.ts`: `downloadBytesBuffer`, `downloadDataBytesBuffer`, `createOZJTexture`,
  `readOJZBufferAsJPEGBuffer`, `toRadians`, `isFlagInBinaryMask`, plus byte and packet helpers it
  re-exports from `core/binaryUtils` and `net/wireUtils`.
- `compressedAssets.ts`: `fetchAssetBytes`, `prefetchAsset`; `COMPRESSED_EXTENSIONS`,
  `COMPRESSED_SUFFIX` for the build tools.
- `modelLoader.ts`: `loadGLTF(path, world)`, `warmGLTF`, `evictContainers`, `getMaterial`,
  `getScrollVariant`, `getFlatLitVariant`, `setMeshFadeBlend`, `syncMaterialQuality`,
  `syncTexturePack`, `getModel`.
- `texturePacks.ts`: `texturePacks` (store), `loadPackIndex`, `setActivePack`, `ORIGINAL_PACK`,
  `packsBase`, `onTexturePackChanged`, `packRepaintsPending`.
- `assetDownload.ts`: `assetDownload` (store), `AssetGroup`, `loadAssetsIndex`, `startDownload`,
  `cancelDownload`, `clearDownloaded`, `storageUsed`, `ensureCacheWorker`.
- `itemIconPack.ts`: `prefetchItemIcons`, `itemIconPackChain`, `itemIconUrl`, `itemIconKey`.
- `worldAssets.ts`: `assetWorldNum`, `onWorlds`, `*_WORLDS` lists (readers over `maps`).
- `ktx2Pixels.ts`: `isKtx2`, `loadTranscoder`, `decodeKtx2`, `TranscoderUrls`.
- `bmd/`: `BMD`, `BMDReader`, `BMDTextureBone` (used by `tools/bmdToGlb.ts`).
- `mu/`: `loadMuSprite`, `loadInterfaceSprite`, `peekMuSprite`, `peekInterfaceSprite`,
  `clearSpriteCache`, `MuSprite`; `decodeTGA`; `loadGates`, `findEntranceGateAt`; preload
  (`preloadPregameSprites`, `preloadWorldSprites`, `clearWorldSprites`); terrain prefetch
  (`prefetchWorldTerrain`, `fetchTerrainFile`, `consumeTerrainFile`, `terrainFilesFor`);
  `warmWorldObjects`; `SNOW_ART`, `ArtMatch`; `loadQuestTables` and its types; `loadMoveReqList`;
  `localisedItemName`, `localisedSkillName`, `localisedBuffName`, `localisedNpcName`,
  `loadNpcNames`, `onNpcNamesChanged`; `decodeLocalText`, `downloadLocalDataFile`.

## How it works
- Every byte read goes through `fetchAsset`: for a compressible extension it asks for
  `<file>.gz` first and unpacks it with `DecompressionStream`, else it reads the plain file. A
  missing file or a dev server's `index.html` answer throws instead of returning garbage.
- `loadGLTF` parses each GLB once into an `AssetContainer` and hands out clones. Item materials are
  cached by their arguments, so a Classic / PBR switch (`syncMaterialQuality`) swaps pointers. Each
  newly cached texture goes through `applyPackToTexture`. `evictContainers` drops a map's folder
  on warp.
- Texture packs: `packsBase()` swaps `game-assets` for `packs` in the version's asset path. A
  pack's `pack.json` maps `<label>|<WxH>` (and `|ozt` / `|ozj` for same-size pairs) to a file, and
  `updateURL` repoints the live texture. See [texture_packs.md](../../../docs/texture_packs.md).
- `mu/` reads the original files: OZJ / OZT sprites, `gate.bmd`, the quest, move and name tables
  in `Data/Local/<pack>/`. In the `.bmd` tables each record is XOR-ed with the 3-byte Bux key,
  restarting at every record. The item, skill and buff name tables only overlay the English names
  the client already has; they load nothing for English.

## Depends on / used by
- uses: `render` (babylon, materials, `pbrMaps`, `textureScript`), `item_fx/itemMaterial`,
  `terrain` (`mapFileEncryption`, tile lists), `maps`, `net/wireUtils`, `interface/item_icons`,
  `actors/skinTexture`, `version`, `i18n`, `core`, `modules/options`, `modules/items`.
- used by: nearly every controller (`render`, `fx`, `terrain`, `sound`, `lighting`, `interface`,
  `actors`, `maps`, `weather`), `ecs/systems`, `app/boot.tsx`, `app/store.ts`, `modules`
  (quests, skills, inventory, economy, character select), `versions/shared` (items, monsters, ui),
  and `tools/` (`bmdToGlb.ts`, `assetsIndex.ts`, `compressAssets.ts`).

## Change it
- add a texture pack: build it into `public/packs/<id>/` and list it in `public/packs/index.json`
  ([texture_packs.md](../../../docs/texture_packs.md)). No code change.
- add a gzip-compressed extension: add it to `COMPRESSED_EXTENSIONS`; `tools/compressAssets.ts`
  reads the same set.
- read a new `Data/Local` table: add `mu/<name>File.ts` using `downloadLocalDataFile` (English
  fallback) or `downloadPackDataFile` (pack only, for overlays), `decodeLocalText` and
  `convertBux` per record.
- change the download groups: `tools/assetsIndex.ts` writes `assets-index.json`.
- change which interface sheets preload: `versions/<id>/ui/preload.ts`.

## Tests
- `assetDownload.test.ts`: `urlsOf`, Core cannot be unticked, transfer totals.
- `compressedAssets.test.ts`: sidecar only for listed extensions, gzip or host-unwrapped bytes,
  plain fallback, giving up after failures, SPA fallback treated as missing.
- `ktx2Pixels.test.ts`: KTX2 detection and top-mip decode.
- `texturePacks.test.ts`: `packsBase`, the index, swap and restore, label re-stamp, same-name and
  same-size pairs, alpha kept, broken manifest, `setActivePack` listeners.
- `mu/localNames.test.ts`: item, skill and buff name record layouts.
- `mu/snowArtMatch.test.ts`: `SNOW_ART` against measured tile colours.

## Notes

### assetDownload.ts
The player picks groups on the pre-game screen and they are fetched into the service worker cache.
`settleSidecars(gate.bmd)` runs before the first fetch: the client picks plain or `.gz` URLs once,
so a download that ran earlier would warm the wrong URLs. Sizes shown are transfer sizes (the model
set is 329 MB on disk, 93 MB gzipped).

### compressedAssets.ts
GLB, OZT, terrain files and BMD tables gzip to about a third; OZJ and audio are already JPEG / MP3
and are not packed. Whether sidecars exist is decided once per session by the first compressible
read (or `settleSidecars`); three failures in a row turn them off. The `?nogz` URL query turns
them off for the page load. `prefetchAsset` never starts the probe itself.

### itemIconPack.ts
An `<img>` is a low-priority request queued behind the world's fetches, so a shop's icons used to
trickle in. `prefetchItemIcons` starts them at high priority when the packet lands and keeps up to
512 `Image` objects (LRU). `itemIconManifest.ts` (from `tools/itemIconManifest.ts`) lists which
tint and variant files exist, so missing ones are never requested.

### texturePacks.ts
`updateURL` replaces the internal texture and its `label`, which `pbrMaps.textureSourceName()` and
the texture script rules read, so every swap writes the converter's name back. "Original" reloads
from the bytes the glTF loader kept on `texture._buffer`, captured before the first swap. A swap
also keeps the original `hasAlpha`, so a pack cannot change a cut-out into a solid.

### mu/localData.ts
Webzen ships one folder per language under `Data/Local/` (`Eng/Quest_eng.bmd`). The active
language's `dataPack` picks the folder; `downloadLocalDataFile` falls back to English per file and
tries the base name as given and lower case. `repairPackText` and `checkPackText` handle packs whose
accents were lost before they shipped.

### mu/itemNameFile.ts, mu/buffNameFile.ts
`item_<lang>.bmd`: 8192 records of 84 bytes, a 30-byte name first, index = `group * 512 + num`;
read first by `itemBaseName`. `BuffEffect_<lang>.bmd`: an `int` count then 158-byte records, id at
0, name at 5 (50 bytes). `buffRecipe` (`modules/skills/recipes.ts`) shows the pack name first.

### mu/moveReqFile.ts
An `int` count, then 84-byte records: `index`, main name (32), `/move` alias (32), required level,
max level, zen, gate. The shipped file pads to 50 slots; only `count` rows are read. The root
`Local/Movereq.bmd` (Korean / JP) is not used.

### mu/npcNameFile.ts
`NpcName_<Lang>.txt` is tab-separated text (`84\t1\t"Chief Skeleton Warrior"`, `//` comments). It is
the base table for every language, English included, because the monster table is from an older
version and misses or misnames many types. `monsterDisplayName()` in
`versions/shared/monsters/monstersDatabase.ts` reads it.

### mu/questFiles.ts
Quest (200 x 744 B), Dialog (200 x 1024 B), QuestProgress (41 B records), QuestWords (`{int index;
short len}` + text) and NPCDialogue (88 B records). `QuestAttributeFile` is 38 bytes of header,
16 class acts of 24 bytes at 38, then 16 requests of 20 bytes at 424 (padding at 422).
