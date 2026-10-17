# assets

Getting game files into the client: the two data roots, fetching with gzip sidecars, the glTF
model cache and item materials, texture packs, the pre-game download, the item icon pack, the BMD
reader (`bmd/`) and the readers for the original `Data/` tree (`mu/`). `index.ts` is the door
for new imports (`loadGLTF`, `evictUnusedContainers`, `localisedNpcName`, `reportLoadFailure`, `settle`); older code still
imports the modules below directly (baselined in `tools/checks`).

## Public API
- `loadFailure.ts`: `reportLoadFailure(what)`, a `.catch` handler for fire-and-forget loads that
  warns once per `what` and never rethrows; `settle(promise, what)`, the same as a promise that
  resolves to `undefined` instead of rejecting.
- Data roots: `resolveUrlToDataFolder(url)` (converted assets, `gameVersion.data.assets`, or the
  tree the version borrows a file it does not ship from; `assetUrl(data, url)` is the pure form;
  `hasAssetFile(url)` is false for a file the version `lacks`; `assetsIndexUrl(data)` is the
  version's pre-download index, `assets-index.json` beside `game-assets/`, `assets-index-v097d.json`
  beside `game-assets-v097d/`);
  `mu/dataFolder.ts`: `resolveDataUrl`, `downloadDataFile`, `hasDataFile` (the original `Data/`
  tree, `gameVersion.data.folder`, or the tree the version borrows a path it lacks from:
  `borrows.folderPaths`; `dataUrl(data, path)` and `hasData(data, path)` are the pure forms).
- `download.ts`: `downloadBytesBuffer`, `downloadDataBytesBuffer`, `createOZJTexture`,
  `readOJZBufferAsJPEGBuffer`, `toRadians`, `isFlagInBinaryMask`, plus byte and packet helpers it
  re-exports from `core/binaryUtils` and `net/wireUtils`.
- `compressedAssets.ts`: `fetchAssetBytes`, `prefetchAsset`; `COMPRESSED_EXTENSIONS`,
  `COMPRESSED_SUFFIX` for the build tools.
- `liteAssets.ts`: `liteVariantOf(path)` and `liteSourceOf(path)`, the names of the lighter copies
  `tools/liteAssets.ts` writes beside the originals (`<file>.OZJ.webp`, `items/<name>.webp`,
  `Music/<name>.opus.ogg`).
- `modelLoader.ts`: `loadGLTF(path, { scene })` (a `World` passes as it is; a model with no entity,
  a bag icon, passes its scene), `disposeLoadedModel` (a clone with its skeleton and
  clips), `warmGLTF`, `evictContainers`, `evictUnusedContainers(folders)`, `getMaterial`,
  `getScrollVariant`, `getFlatLitVariant`, `setMeshFadeBlend`, `setMeshUnlit`, `syncMaterialQuality`,
  `syncTexturePack`, `getModel`; `getDataTexture(scene, path)` (a `Data/` bitmap for a mesh drawn with
  another texture than its own, top-down like the GLBs'), `ALPHA_TEST_AND_BLEND`.
- `lazyAnimationGroups.ts`: `lazyAnimationGroups` (the clip list `loadGLTF` hands out),
  `forEachAnimationGroup(groups, fn)` (every clip, and each one cloned later),
  `animationGroupSource(groups, i)` (a clip's keys without cloning it), `cloneTargets`.
- `texturePacks.ts`: `texturePacks` (store), `loadPackIndex`, `setActivePack`, `ORIGINAL_PACK`,
  `packsBase`, `onTexturePackChanged`, `packRepaintsPending`, `textureLabel`.
- `assetDownload.ts`: `assetDownload` (store), `AssetGroup`, `loadAssetsIndex`, `startDownload`,
  `cancelDownload`, `clearDownloaded`, `storageUsed`, `ensureCacheWorker`.
- `cacheReset.ts`: `clearCacheAndReload()` (ours, the Options button and `app/buildCheck.ts`): Ctrl+F5
  for whoever cannot press it. Drops the worker's cached assets but the music, unregisters the
  worker and reloads with a throwaway `?r=`.
- `itemIconPack.ts`: `prefetchItemIcons`, `itemIconPackChain`, `itemIconUrl`, `itemIconKey`.
- `worldAssets.ts`: `assetWorldNum`, `*_WORLDS` lists (readers over `maps`).
- `ktx2Pixels.ts`: `isKtx2`, `loadTranscoder`, `decodeKtx2`, `TranscoderUrls`.
- `bmd/`: `BMD`, `BMDReader`, `BMDTextureBone` (used by `tools/bmdToGlb.ts`).
- `preloadSprites.ts`: `preloadPregameSprites`, `preloadWorldSprites`, `clearWorldSprites`.
  `prefetchWorld.ts`: `prefetchWorldTerrain`, `fetchTerrainFile`, `consumeTerrainFile`,
  `terrainFilesFor`. `warmWorld.ts`: `warmWorldObjects`. `itemIconManifest.ts`: generated.
- `mu/` (readers of the original `Data/` files; outside code goes through `mu/index.ts`):
  `loadMuSprite`, `loadInterfaceSprite`, `peekMuSprite`, `peekInterfaceSprite`,
  `clearSpriteCache`, `MuSprite`; `decodeTGA`; `loadGates`, `findEntranceGateAt`;
  `loadQuestTables` and its types; `loadMoveReqList`;
  `localisedItemName`, `localisedSkillName`, `localisedBuffName`, `localisedNpcName`,
  `skillDisplayName(number)` (`mu/skillNames.ts`: the pack's name, else `skillsDatabase`'s; on the door),
  `loadNpcNames`, `onNpcNamesChanged`; `decodeLocalText`, `downloadLocalDataFile`.
- `itemSetTables()`, `loadItemSetTables(types, options)` and `ItemSet`, `ItemSetTables`, `SetOption`
  (`mu/itemSetFile.ts`, on the door): the ancient sets, loaded on first ask.
- `itemOptionTables()`, `loadItemOptionTables(harmony, sockets, addOptions)` and their types
  (`mu/itemOptionFiles.ts`, on the door): the Jewel of Harmony, socket and 380 option tables.
- `mixRecipes()`, `loadMixRecipes(bytes)`, `MIX_TYPES` and `MixRecipe`, `MixSource`, `MixRateToken`
  (`mu/mixFile.ts`, on the door): the chaos machine recipes, loaded on first ask.
- `creditLines()`, `loadCredits(bytes)`, `parseCredits(bytes)`, `CreditLine` (`mu/creditFile.ts`, on the door):
  `Local/credit.bmd`, the staff roll of the credits screen (400 class and name records, one Bux pass).
- `globalText(id)`, `loadGlobalText(bytes)` (`mu/globalTextFile.ts`, on the door): the pack's `Text.bmd`
  lines, for what the data files name by number.

## How it works
- Every byte read goes through `fetchAsset`: for a compressible extension it asks for
  `<file>.gz` first and unpacks it with `DecompressionStream`, else it reads the plain file. A
  missing file or a dev server's `index.html` answer throws instead of returning garbage.
- `loadGLTF` parses each GLB once into an `AssetContainer` and hands out clones. Item materials are
  cached by their arguments, so a Classic / PBR switch (`syncMaterialQuality`) swaps pointers; it
  also drops each skinned mesh's draw cache, as a frozen material kept its stale effect (the hero
  drew dark, then in shards). Each
  newly cached texture goes through `applyPackToTexture`. `evictContainers` drops a map's folder
  on warp; `evictUnusedContainers` drops the monster and NPC models nothing draws any more (called
  last in `app/lifecycle.ts`), as the original releases them on every map change (`DeleteMonsters`,
  `DeleteNpcs`). A container counts as used while a clone shares its geometry, and one asked for in
  the last 10 s is kept (a clone may be on its way). Items, player gear and skill models stay
  cached, as the original keeps them loaded.
- Texture packs: `packsBase()` swaps `game-assets` for `packs` in the version's asset path. A
  pack's `pack.json` maps `<label>|<WxH>` (and `|ozt` / `|ozj` for same-size pairs) to a file, and
  `updateURL` repoints the live texture. See [texture_packs.md](../../../docs/texture_packs.md).
- `mu/` reads the original files: OZJ / OZT sprites, `gate.bmd`, the quest, move and name tables
  in `Data/Local/<pack>/`. In the `.bmd` tables each record is XOR-ed with the 3-byte Bux key,
  restarting at every record. The item, skill and buff name tables only overlay the English names
  the client already has; they load nothing for English. `gate.bmd` is decoded with the version's
  `data.gates` layout, Season 6's (`SEASON6_GATES`: 512 records of 14 bytes) when it names none.

- Fire-and-forget loads (`void loadX(file).then(...)`, nobody awaits them) end in
  `.catch(reportLoadFailure(file))`, or go through `settle`. A missing file then logs one warning
  per path and whatever it fed is simply not drawn, instead of an unhandled rejection per call.

## Depends on / used by
- uses: `render` (babylon, materials, `pbrMaps`, `textureScript`), `item_fx/itemMaterial`,
  `terrain` (`mapFileEncryption`, tile lists), `maps`, `net/wireUtils`, `interface/item_icons`,
  `actors/skinTexture`, `version`, `i18n`, `core`, `settings`, `item_rules`.
- used by: nearly every controller (`render`, `fx`, `terrain`, `sound`, `lighting`, `interface`,
  `actors`, `maps`, `weather`), `ecs/systems`, `app/boot.tsx`, `modules`
  (quests, skills, inventory, economy, character select), `versions/shared` (items, monsters, ui),
  and `tools/` (`bmdToGlb.ts`, `assetsIndex.ts`, `compressAssets.ts`).

## Change it
- start a load nobody awaits: end it with `.catch(reportLoadFailure(file))` (or wrap it in
  `settle`); never leave a bare `void load(x).then(...)`.
- add a texture pack: build it into `public/packs/<id>/` and list it in `public/packs/index.json`
  ([texture_packs.md](../../../docs/texture_packs.md)). No code change.
- add a gzip-compressed extension: add it to `COMPRESSED_EXTENSIONS`; `tools/compressAssets.ts`
  reads the same set.
- read a new `Data/Local` table: add `mu/<name>File.ts` using `downloadLocalDataFile` (English
  fallback) or `downloadPackDataFile` (pack only, for overlays), `decodeLocalText` and
  `convertBux` per record.
- change the download groups: `tools/assetsIndex.ts` writes one index per version (`assetsIndexUrl`).
- change which interface sheets preload: `versions/<id>/ui/preload.ts`.

## Tests
- `lazyAnimationGroups.test.ts`: a clip is cloned on its first read only, iteration walks the
  cloned ones, hooks run on later clones, a clip made later is appended, a source is read without cloning, nodes map
  by name path or not at all.
- `modelLoader.test.ts`: a clone gets only the clip it plays at load, another on first read onto
  its own node, every clip at once when its nodes cannot be matched; `syncMaterialQuality` drops a skinned mesh's draw cache only;
  `evictUnusedContainers` drops a monster or NPC model with no clone left,
  keeps one still drawn, one asked for in the last 10 s and the folders it is not given.
- `resolveUrlToDataFolder.test.ts`: own files stay on the version root, the rest come from the
  borrowed tree, a file the version lacks is never borrowed, absolute urls pass through; each
  version names its own index.
- `loadFailure.test.ts`: one warning per file, a different file warns again, `settle` passes a
  value through and turns a failure into `undefined`.
- `assetDownload.test.ts`: `urlsOf`, Core cannot be unticked, transfer totals.
- `cacheReset.test.ts`: the music stays, the rest and the worker go, the page reloads.
- `cacheWorker.test.ts`: `public/sw.js` run against an in-memory cache: a new build drops what another
  downloaded (the music kept), its own build keeps it, an asset it does not hold is revalidated once.
- `compressedAssets.test.ts`: sidecar only for listed extensions, gzip or host-unwrapped bytes,
  plain fallback, giving up after failures, SPA fallback treated as missing.
- `ktx2Pixels.test.ts`: KTX2 detection and top-mip decode.
- `texturePacks.test.ts`: `packsBase`, the index, swap and restore, label re-stamp, `textureLabel`
  mid-swap, same-name and same-size pairs, alpha kept, broken manifest, `setActivePack` listeners.
- `mu/localNames.test.ts`: item, skill and buff name record layouts.
- `mu/dataFolder.test.ts`: own, borrowed and absent `Data/` paths.
- `mu/gates.test.ts`: the Season 6 gate layout, a byte-wide period one, a truncated file.
- `mu/itemSetFile.ts` is tested through `controllers/item_rules/ancientSets.test.ts` and the
  tooltip test, which read the real files.
- `mu/mixFile.ts` is tested through `modules/chaos_mix/mixRecipes.test.ts` on the real `Mix.bmd`.
- `mu/creditFile.ts` is tested through `versions/shared/ui/windows/credits/index.test.tsx` on the real `credit.bmd`.

## Notes

### assetDownload.ts
The player picks groups on the pre-game screen and they are fetched into the service worker cache.
Each version reads its own index (`assetsIndexUrl`), which lists a borrowed file at the lender's url,
so a file both versions read is cached once.
The worker is registered as `sw.js?build=<BUILD_ID>` (one per build, `vite.config.ts`): a deploy installs a new
worker, which drops what another build downloaded (a file changed under the same name stayed the old one
for good, the music excepted) and asks the server once, per worker, about each asset it does not hold.
`settleSidecars(gate.bmd)` runs before the first fetch: the client picks plain or `.gz` URLs once,
so a download that ran earlier would warm the wrong URLs. Sizes shown are transfer sizes (the model
set is 329 MB on disk, 93 MB gzipped).

### compressedAssets.ts
GLB, OZT, terrain files and BMD tables gzip to about a third; OZJ and audio are already JPEG / MP3
and are not packed. Whether sidecars exist is decided once per session by the first compressible
read (or `settleSidecars`); three failures in a row turn them off. The `?nogz` URL query turns
them off for the page load. `prefetchAsset` never starts the probe itself.

### lazyAnimationGroups.ts
`instantiateModelsToScene` cloned every clip for every copy, and the player rig carries 284 of
them (a few dozen for a monster) while a copy plays a handful: thousands of AnimationGroups in a
crowd, and the clone cost on each player that came into view. `loadGLTF` now instantiates without
the clips and hands out this list, which clones clip `i` onto the copy's nodes the first time
`groups[i]` is read. The nodes are matched by their name path (the clones are named after their
sources); a model with two nodes on one path gets every clip at load, as before. Iterating the list
walks only the cloned clips, so whatever every clip must get as it comes (the end observer, the
speed) goes through `forEachAnimationGroup`. The original keeps one copy of each action per model
(`Models[].Actions`) for every object drawing it.

### itemIconPack.ts
An `<img>` is a low-priority request queued behind the world's fetches, so a shop's icons used to
trickle in. `prefetchItemIcons` starts them at high priority when the packet lands and keeps up to
512 `Image` objects (LRU). `itemIconManifest.ts` (from `tools/itemIconManifest.ts`) lists which
tint and variant files exist, so missing ones are never requested.

### texturePacks.ts
`updateURL` replaces the internal texture and its `label`, which `pbrMaps.textureSourceName()` and
the texture script rules read, so every swap writes the converter's name back once the image is
in. Until then `textureLabel()` answers from the name remembered before the swap, and
`textureSourceName()` asks it first (`modelLoader.ts` hands it to `pbrMaps.readPackLabelsWith`,
since render cannot import assets' door without a cycle): the sign plates read the name straight
after a model loads, mid-swap, and saw `snotice.ozj.webp` instead of `Object3/snotice`. "Original"
reloads from the bytes the glTF loader kept on `texture._buffer`, captured before the first swap. A swap
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

### mu/itemSetFile.ts
`ItemSetType.bmd`: 8192 records of 4 bytes (`ITEM_SET_TYPE`: two set numbers, 0 or 255 for none,
then the mix level), each BuxConverted. `ItemSetOption_<lang>.bmd`: 64 records of 110 bytes
(`ITEM_SET_OPTION_FILE`: name 64, standard options 6 x 2 and their values, ext 2 + 2, count, full
5 + 5, classes 7). The set's item count comes from the type table. Some English names carry the
Korean apostrophe `0xA1 0xAF`; it is read as `'`. The checksum after each table is not checked.

### mu/itemOptionFiles.ts
`JewelOfHarmonyOption_<lang>.bmd`: 3 x 10 records of 180 bytes (type, name 60, min level, 14
values, 14 prices), one BuxConvert over the whole table; option N is record N - 1.
`SocketItem_<lang>.bmd`: 3 x 50 records of 104 bytes (id, category, name 64, type, 5 values, 6
check bytes), one BuxConvert per record. `ItemAddOption.bmd`: 8192 records of 16 bytes (option,
value, option, value, type, time), one BuxConvert over the whole table.

### mu/mixFile.ts
`Mix.bmd`: 14 BuxConverted `int` counts (one per mix type), then that many 656-byte `MIX_RECIPE`
records, each BuxConverted on its own: index, `m_iMixID`, the name, description and advice text
ids, the result's size, level, zen type and zen, 32 rate tokens (op, float), the max rate, three
option chars and 8 40-byte sources (item code, level, option, durability and count ranges, special
bits).

### mu/globalTextFile.ts
`Text_<lang>.bmd`: 'GT', a `uint32` count, then per line its id, its length and its BuxConverted bytes.
The Eng, Spn and Por packs ship the same English file, so recipe names read English everywhere.

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
