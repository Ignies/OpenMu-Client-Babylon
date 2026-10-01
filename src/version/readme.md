# version

The seam between the engine and a game version: the `GameVersion` contract, the UI contract, and
the loader that resolves which version this page runs. See [../../docs/versions.md](../../docs/versions.md).

## Public API
- `gameVersion`, `versionPackets` (`index.ts`): the loaded version and its packet lists. Read
  everywhere, often at module scope.
- `loadGameVersion(id)`: loads a version's core (contract data + packets). Called by
  `app/main.tsx` before the app graph is imported, and by `testSetup.ts`.
- `versionIdForTag(tag)`, `versionByTag(tag)`, `versionTags()`: map a server list tag (`S6EP3`)
  to a registry entry, case-insensitive; no tag or an unknown tag means `DEFAULT_VERSION_ID`.
- `loadVersionUi()` / `versionUi()`: the version's UI module, loaded on first use / or `null`
  until it has loaded.
- `ensureActiveVersion(tag)`: `true` when the loaded version plays `tag`, else reloads the page.
- Types: `GameVersion`, `VersionData`, `VersionFeatures`, `VersionProtocol`, `VersionEncryption`
  (`contract.ts`); `VersionUi`, `PregameUi`, `PregameBackdrop`, `PregameScene` (`uiContract.ts`).

## How it works
- `contract.ts` is everything a version may differ in: OpenMU identity, client version / serial
  bytes, packet set and `variantRank`, encryption keys (SimpleModulus, Xor32, Xor3), data URLs and
  an optional file `inventory`, and `features` flags. Base code reads these and never compares a
  version id.
- `data.inventory` lists every file a period `Data/` tree ships. Base code asks for Season 6 files
  a period tree lacks; with the list, loaders draw nothing instead of logging misses. Season 6
  omits it.
- `uiContract.ts` is types only, so `versions/registry.ts` can name it without importing app code.
  A version's `ui/` module may import app code because it is only loaded after boot.
- A pre-game backdrop is either `world` (warp to login worlds, Season 6) or `scene` (a set piece
  built in the scene, 0.97d's ship).
- Switching to a world of another version is a page reload (`ensureActiveVersion`): module-scope
  captures of `gameVersion` exist across the app. The selection is persisted first, so the reload
  cannot loop.

## Depends on / used by
- uses: `versions/registry.ts`; types from `core/types`, `ecs/world`, `controllers/interface/windows`.
- used by: `app/` (main, App, store), `controllers/assets` loaders, `controllers/net/packets.ts`,
  `controllers/item_fx`, features `servers` and `mu_helper`, `ecs/systems/loginSceneSystem.ts`,
  `versions/registry.ts`, every `versions/<id>/` and some shared windows.

## Change it
- something a version can differ in: add a field to `GameVersion` (or a flag to `VersionFeatures`)
  in `contract.ts`, fill it in every `versions/<id>/index.ts` (and `versions/_template/`), read
  it from `gameVersion` in base code.
- a new per-version screen: add it to `VersionUi` in `uiContract.ts`; every version exports it
  (a version without it exports a component that renders nothing).
- add a version: [../../docs/versions.md](../../docs/versions.md) "Adding a version".

## Tests
- No tests here. `testSetup.ts` is the vitest setup file (`vite.config.ts`): it loads the default
  version and forces `navigator.language` to `en-US` for every test.
  `versions/registry.test.ts` checks every registry entry loads.
