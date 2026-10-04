# fidelity

How close to the original client the game runs. Classic is the original 1:1; Enhanced and Ultra
turn on deliberate improvements. Each improvement is one file in `versions/shared/improvements/`;
the code that deviates from the original asks `isOn('<id>')` and keeps the original path when off.

## Public API
- `defineImprovement({ id, preset, labelKey, hintKey })`: an improvement file's default export.
  `preset` is the lowest preset that turns it on (`'enhanced'` or `'ultra'`).
- `registerImprovements(defs)`: called by `versions/shared/improvements/all.ts`; an id twice in
  one call throws.
- `isOn(id)`: whether that deviation runs. One `Map` read, no allocation, safe per frame. An id
  nothing registers is off (Classic).
- `FIDELITY_CLASSIC` / `FIDELITY_ENHANCED` / `FIDELITY_ULTRA` (0 / 1 / 2), `FIDELITY_MAX`,
  `FIDELITY_DEFAULT` (Enhanced).
- For the options: `setFidelityChoice(preset, overrides)`, `improvements()`,
  `improvementOn(id, preset, overrides)`, `isCustom(preset, overrides)`,
  `withImprovement(id, value, preset, overrides)`, `cleanOverrides(raw)`, `presetTurnsOn(def, preset)`.

## How it works
- The choice is stored in `GameOptions` (`modules/options`): `fidelity` (the preset) and
  `fidelityOverrides` (id -> boolean, only the ids set apart from the preset). The options module
  pushes both here at load and on every change (`setFidelityChoice`); this controller never reads
  `GameOptions`, so it adds no controller -> module import.
- On each push or registration the answer for every registered id is cached in a `Map`; `isOn`
  reads it.
- "Custom" is any registered id whose override differs from its preset. A preset click clears the
  overrides. Ids from an old save that nothing registers any more are ignored (off, not Custom)
  and dropped the next time a check changes.
- Only deliberate deviations are improvements. A fix that makes the client match the original is
  never a toggle: Classic must be the true original.
- Enhanced is the default, so every improvement that existed before this option stays on.
- The graded lighting and material looks (`tierIndex() >= ENHANCED_TIER`, skill `enhanced` rows)
  stay on their own quality options (`lighting/lightingQuality.ts`, `render/materialQuality.ts`);
  they are not improvements.

## Depends on / used by
- uses: nothing (the `TextKey` type).
- used by: `modules/options/gameOptions.ts` (pushes the choice), the Options window's Fidelity page
  (`versions/shared/ui/windows/options/fidelity.tsx`), `versions/shared/improvements/` and every
  deviation site (`isOn`).

## Change it
- add an improvement: [docs/how_to/add_improvement.md](../../../docs/how_to/add_improvement.md).
- a new preset level: a constant here, `RANGES.fidelity` in `gameOptions.ts`, and a plate in the
  Fidelity page.

## Tests
- `fidelity.test.ts`: presets, overrides, Custom, unknown ids from old saves, the blob cleaner.
- `versions/shared/improvements/improvements.test.ts`: every file registers, has its text, and is
  read at a site; Classic turns them all off.
