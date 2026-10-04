# settings

The player's settings, kept in the browser (`GameOptions`). Engine-level: render, sound, terrain,
lighting, weather, camera, fx, item_fx, assets and the interface read them, so they live below the
modules. The gameplay side of options (the server's saved hot keys, the mobile skill pad) stays in
`src/modules/options`.

## Public API
- `GameOptions`: the live options object, a MobX observable; read it anywhere.
- `setGameOption(key, value)`: sets one option, saves all of them, calls the listeners.
- `onGameOptionsChanged(listener)`: subscribe; returns the unsubscribe.
- `defaultGameOption(key)`: the fresh-install value (the Options window's Defaults).
- `uiScaleFactor(step)`, `UI_SCALE_MAX`, `TONE_MAPPER_MAX`, `BRIGHTNESS_MIN` / `BRIGHTNESS_MAX`.
- `optionsFrom(parsed)` and `migrate(stored)` (`gameOptions.ts`, for its tests): a stored blob over
  the defaults, cleaned and clamped.

## How it works
- `GameOptions` is loaded once from localStorage key `mu_options`: `DEFAULTS` first, the stored blob
  on top, then numeric options clamped to `RANGES`. `migrate` drops retired keys (`DROPPED_KEYS`) and
  maps the two that survive (`toneMapping` -> `toneMapper`, `exposure` -> `brightness`, plus the
  vignette rescale), then saves. The stored format is the one `modules/options` wrote before the
  move, byte for byte, so old saves load unchanged.
- Fidelity: `fidelity` (0 Classic / 1 Enhanced / 2 Ultra) and `fidelityOverrides` (improvement id ->
  boolean, only the ones set apart from the preset). `optionsFrom` drops a bad overrides blob; a
  save from before the option gets Enhanced and no overrides, which is how the client behaved. On
  load and on every change of either key this pushes them to `controllers/fidelity`
  (`setFidelityChoice`), which answers `isOn(id)`.
- Ranges and defaults owned elsewhere are literals: the camera FOV (`camera/recipes.ts`), render
  distance and render scale steps (`render/`), the low vital thresholds (`modules/hero/lowVitals.ts`),
  the sound buses, MSAA, anisotropy, the rendering style, material detail, compare tooltips and emoji
  sizes. Their owners import this controller, so naming their constants here would close a cycle;
  `limits.test.ts` pins the first four to their owners.
- `configFingerprint` (`render/configFingerprint.ts`) packs every option into the perf overlay's hex.

## Depends on / used by
- uses: `core/localStorage`, `controllers/fidelity`, `mobx`.
- used by: about 80 files: controllers (render, lighting, terrain, sound, weather, camera, fx,
  item_fx, assets, interface), ECS systems, modules, windows (`versions/shared/ui/windows/options/`,
  `catalogue.ts`; `debug_menu/`), HUD (`minimap/`, `low_health_overlay/`, `chat/`).

## Change it
- add an option: add the field (with a comment) to the `GameOptions` type, its value to `DEFAULTS`,
  a range to `RANGES` if numeric, and a row in `versions/shared/ui/windows/options/catalogue.ts`.
- add an improvement (a Fidelity check): [docs/how_to/add_improvement.md](../../../docs/how_to/add_improvement.md);
  nothing changes here.
- retire an option: remove it and add the key to `DROPPED_KEYS`; map it in `migrate` if it survives in
  another shape.

## Tests
- `gameOptions.test.ts`: `migrate` (retired keys, tone mapper and brightness mapping, vignette rescale,
  stored tiers kept); `optionsFrom` (old saves get Enhanced, the preset is clamped, a bad overrides
  blob is dropped).
- `limits.test.ts`: the literal ranges and defaults equal their owners' constants.
- `render/configFingerprint.test.ts` and `docs/configuration_hex.md`: the option layout.
