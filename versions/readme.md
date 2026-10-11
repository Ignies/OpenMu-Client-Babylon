# versions

Game content, per game version. One client build carries every version listed in `registry.ts`;
the server list picks one per page load. Overview: [docs/versions.md](../docs/versions.md).

## Public API
- `VERSION_REGISTRY`: every shipped version (`id`, `label`, `listTag`, `load`, `loadUi`).
- `DEFAULT_VERSION_ID`: `'season6'`.
- `VersionModule`, `VersionPackets`, `VersionEntry`: the types a version folder fills.

## How it works
- `registry.ts` keeps the entry metadata eager, so the server picker can match a list tag
  (`S6EP3`, `V097D`) without loading a version body.
- `load()` imports `versions/<id>/index.ts` (the `GameVersion` plus its packet lists).
  `loadUi()` imports `versions/<id>/ui` separately, because UI reaches app code.
- A version's `index.ts` imports only the contract (`src/version/contract.ts`), generated packet
  files and its own data. Never app code.
- `src/version/index.ts` (`loadGameVersion`) resolves the entry and holds the active version.

```
registry.ts   every version the client ships
shared/       content any version can load (skills, maps, items, ui, packets...)
season6/      Season 6 Episode 3, the default
v097d/        MU 0.97d
_template/    copy to start a new version (compiles, never registered)
```

## Depends on / used by
- uses: `src/version/contract.ts`, `src/version/uiContract.ts` (types only)
- used by: `src/version/index.ts`

## Change it
- add a version: copy `_template/` to `<id>/`, fill every `TODO`, add an entry to
  `VERSION_REGISTRY`. Keep `label` and `listTag` equal to the module's `gameVersion`.
- change one version only: edit `versions/<id>/`, never add an `if (version)` in `src/`.

## Tests
- `registry.test.ts`: the registry lists season6 (default) and v097d, entry metadata matches each
  body, list tags are distinct, and Season 6 keeps its login bytes, Xor keys and variant ranks.
