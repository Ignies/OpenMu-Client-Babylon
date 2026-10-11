# ui/i18n

Text used by more than one window, HUD element or page and by nothing below the UI: the command
buttons both command windows show, the pet tips of the bottom bar and the pet window, the login
labels of the preloader and the login page. A key used by one window lives in that window's own
`i18n/`.

## Public API
- `en.ts` (required) and one `<code>.ts` per language; read through `t()` from `@/i18n`.

## How it works
- Found by `src/i18n/sources.ts`'s glob like every other `i18n/` folder. See
  [src/i18n/readme.md](../../../../src/i18n/readme.md).

## Change it
- a key only one window uses any more: move it to that window's `i18n/` (every language).

## Tests
- `src/i18n/coverage.test.ts`: every key translated in every language.
