# i18n

Every string the client writes on screen, in every language, and the language selector's state.
English is the source and the fallback.

## Public API
- `t(key, params?)` (`index.ts`): one line of text in the current language; `{named}` holes are
  filled from `params`. Read it inside an `observer` render so it follows a language change.
- `i18n`: the selector side: `languages`, `language`, `current`, `setLanguage(code)`,
  `register(layer)`, `translated(key)`, and the current `dataPack` / `dataEncoding` /
  `dataRepairs` / `itemNameFixes` / `dialogPageFixes`.
- `onLanguageChanged(fn)`: for things `t()` cannot redraw (the `Data/Local` tables are fetched
  again).
- `textTable({ field: TextKey })`: an object whose reads are live `t()` calls (`EVENT_TEXT`,
  `MASTER_TEXT`, layout labels).
- Types: `TextKey`, `LanguageLayer`, `FlagRegion`.
- `matchServerText(text)`, `translateServerText(text)` (`serverText.ts`): used by
  `modules/chat/net.ts`.

## How it works
- `recipes.ts` holds `EN_TEXT`; `TextKey` is derived from it, so a missing or misspelled key does
  not compile. Keys are `area.thing`. The few `%s` / `%d` lines are the original client's format
  strings, spliced by their call sites as `ZzzInterface.cpp` did.
- One file per language exports a `LanguageLayer` (`layer.ts`): code, aliases, label, flag
  `region`, `strings` (partial; missing keys fall back to English), optional `font` (CJK, Thai)
  and `dataPack` (the `Data/Local/<folder>/` pack: folder, file suffix, code page, repairs).
- `layers.ts` is the only list of languages, in selector order (English first).
- `index.ts` picks the language: the stored code (`mu_language`), else the browser's
  `navigator.languages` (exact code, alias, then primary subtag), else English. The current code
  is a mobx observable, so `observer` components redraw on change. It also sets `<html lang>` and
  the `--mu-script-font` CSS property. In dev it warns about languages missing keys.
- Webzen shipped only some `Data/Local` packs; the rest are built by `tools/localPacks.ts` from
  `tools/packs/`. A language without a pack keeps that text in English.

### Notes: serverText.ts
OpenMU sends player messages as finished English (`ServerMessage`) and ships no other culture.
Every sentence it can send is a `serverMessage.*` line in `recipes.ts`, worded exactly as OpenMU
words it, so the English catalogue doubles as the pattern (`{0}`, `{1}` holes become capture
groups). A line that matches nothing (GM broadcasts, guild notices) is returned untouched.

### Notes: packRepairs.ts, itemNames.ts, dialogPages.ts
Fixes for shipped packs, applied after decoding by `controllers/assets/mu/` (`localData.ts`,
`itemNameFile.ts`, `questFiles.ts`). `packRepairs.ts`: the Spanish and Portuguese
`QuestWords_*.bmd` lost every accented character plus the next byte ("h?oe" for "héroe") in a
bad conversion. Words are restored as data in two passes: `phrases` first (ambiguous forms,
longest match), then whole `tokens`. A token not listed is left alone, since most `?` are real
question marks. `itemNames.ts` replaces item names by `"group/index"`; `dialogPages.ts` replaces
quest dialogue pages by number.

## Depends on / used by
- uses: `core/localStorage`, mobx.
- used by: almost every window, page and module that shows text (`t`); `controllers/assets/mu`
  for the pack data; the options window for the selector.

## Change it
- add a string: add the key to `EN_TEXT` in `recipes.ts`, then translate it in every language
  file (`coverage.test.ts` fails otherwise).
- add a language: copy `_template.ts` to `<language>.ts`, fill it, add `<language>Layer` to
  `layers.ts`. Add its region to `FlagRegion` and the flag component
  (`controllers/interface/components/mu_flag`) if it is new.
- fix a pack's text: add an entry to `packRepairs.ts`, `itemNames.ts` or `dialogPages.ts` and
  point the language's `dataPack` at it.

## Tests
- `coverage.test.ts`: every language translates every key and keeps every `{hole}` and `%` spec.
- `itemNames.test.ts`: the Spanish item name fixes are wired in, hit the right record of
  `Data/Local/Spn/item_spn.bmd`, change it, and leave no scroll called "Rollo".
- `serverText.test.ts`: every catalogued server message matches itself, keeps its values, free
  text is left alone, and the line shows in the chosen language.
