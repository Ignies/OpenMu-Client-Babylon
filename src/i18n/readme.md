# i18n

The text engine: the languages, the current one, `t()`, and a registry that the owners of the text
fill. The strings themselves live with their owners (`<owner>/i18n/<code>.ts`); only text with no
single owner stays here, in `text/`. English is the source and the fallback.

## Public API
- `t(key, params?)` (`index.ts`): one line of text in the current language; `{named}` holes are
  filled from `params`. Read it inside an `observer` render so it follows a language change.
- `registerText(code, strings)`: adds or replaces lines of one language at run time (a streamed
  module's text). A later line for the same key wins.
- `i18n`: the selector side: `languages`, `language`, `current`, `setLanguage(code)`,
  `register(layer)`, `translated(key)`, and the current `dataPack` / `dataEncoding` /
  `dataRepairs` / `itemNameFixes` / `dialogPageFixes`.
- `onLanguageChanged(fn)`: for things `t()` cannot redraw (the `Data/Local` tables are fetched
  again).
- `textTable({ field: TextKey })`: an object whose reads are live `t()` calls (`EVENT_TEXT`,
  `MASTER_TEXT`, layout labels).
- `EN_TEXT`: every key's English line (live), for code that needs the key list.
- Types: `TextKey`, `TextOwners`, `TextStrings`, `LanguageLayer`, `FlagRegion`.
- `matchServerText(text)`, `translateServerText(text)` (`serverText.ts`): used by
  `modules/chat/net.ts`.

## Where text lives
- a window, HUD element or page: `versions/shared/ui/{windows,hud,pages}/<name>/i18n/<code>.ts`.
- a module's packet and system messages: `src/modules/<module>/i18n/<code>.ts`.
- a controller's own text: `src/controllers/<controller>/i18n/` (an interface widget:
  `src/controllers/interface/components/<widget>/i18n/`); also `src/app/i18n`, `src/ecs/i18n`,
  `versions/shared/objects/signs/i18n`, `versions/shared/monsters/i18n`.
- a key several owners use goes to the most specific shared place: the lowest layer that uses it
  (a controller before a module, a module before a window), else `versions/shared/ui/i18n` when
  only UI uses it, `src/modules/_shared/i18n` when only modules use it, else `text/` here.
  `common.*` and the language names stay in `text/`.
- `en.ts` is required; it holds the keys the owner owns. Every other `<code>.ts` translates them.

## How it works
- `sources.ts` finds every text file with one eager `import.meta.glob` (under Bun, where there is
  no Vite, it walks the folders instead; `tools/i18n.ts` uses that). `index.ts` registers each
  file under its file name's code at load. `registry.ts` keeps one table per language.
- `t(key)` reads the current language's line, else English, else the key itself. Every
  `registerText` bumps an observable, so text that arrives after boot redraws what is on screen.
- Keys are typed by declaration merging, so no central key list is kept by hand: `index.ts`
  declares `interface TextOwners` (with `text/`'s own table), and each `en.ts` adds itself:
  `declare module '@/i18n' { interface TextOwners { 'src/modules/party': typeof en } }`.
  `TextKey` is the union of every owner's keys, so a misspelled key does not compile. One member
  per owner (rather than an empty `interface ... extends Record<...> {}`) keeps lint clean and
  makes two owners with the same name a compile error. Translation files check themselves with
  `satisfies Partial<Record<keyof typeof en, string>>` (no stray keys). A generated key file was
  the fallback plan; it was not needed. A streamed module's keys are not built in: it casts them
  (`'mod.key' as TextKey`).
- One file per language (`english.ts`, `spanish.ts`, ...) exports a `LanguageLayer` (`layer.ts`):
  code, aliases, label, flag `region`, optional `font` (CJK, Thai) and `dataPack` (the
  `Data/Local/<folder>/` pack: folder, file suffix, code page, repairs). `layers.ts` is the only
  list of languages, in selector order (English first).
- `index.ts` picks the language: the stored code (`mu_language`), else the browser's
  `navigator.languages` (exact code, alias, then primary subtag), else English. The current code
  is a mobx observable, so `observer` components redraw on change. It also sets `<html lang>` and
  the `--mu-script-font` CSS property. In dev it warns about languages missing keys.
- A layer with `direction: 'rtl'` (Arabic, Persian, Urdu) sets `data-text-direction` on `<html>`.
  `controllers/interface/root.less` then gives every element `unicode-bidi: plaintext`: each line
  takes its direction from its first letter, so it reads from the right while a name, a number or
  a Latin word inside keeps its order, and no window moves (`dir` would mirror the layout).
  Canvas text (signposts) sets `ctx.direction` from the same field.
- The few `%s` / `%d` lines are the original client's format strings, spliced by their call sites
  as `ZzzInterface.cpp` did.
- Webzen shipped only some `Data/Local` packs; the rest are built by `tools/localPacks.ts` from
  `tools/packs/`. A language without a pack keeps that text in English.

### Notes: serverText.ts
OpenMU sends player messages as finished English (`ServerMessage`) and ships no other culture.
Every sentence it can send is a `serverMessage.*` line in `src/modules/chat/i18n/en.ts`, worded
exactly as OpenMU words it, so the English catalogue doubles as the pattern (`{0}`, `{1}` holes
become capture groups). The patterns are built on first use and again after new text registers;
order in that file breaks ties. A line that matches nothing (GM broadcasts, guild notices) is
returned untouched.

### Notes: packRepairs.ts, itemNames.ts, dialogPages.ts
Fixes for shipped packs, applied after decoding by `controllers/assets/mu/` (`localData.ts`,
`itemNameFile.ts`, `questFiles.ts`). `packRepairs.ts`: the Spanish and Portuguese
`QuestWords_*.bmd` lost every accented character plus the next byte ("h?oe" for "héroe") in a
bad conversion. Words are restored as data in two passes: `phrases` first (ambiguous forms,
longest match), then whole `tokens`. A token not listed is left alone, since most `?` are real
question marks. `itemNames.ts` replaces item names by `"group/index"`; `dialogPages.ts` replaces
quest dialogue pages by number.

## Depends on / used by
- uses: `core/localStorage`, mobx; reads every owner's `i18n/` folder by glob.
- used by: almost every window, page and module that shows text (`t`); `controllers/assets/mu`
  for the pack data; the options window for the selector; `tools/i18n.ts`.

## Change it
- add a string: add it to the owner's `i18n/en.ts` (create the folder if the owner has none),
  then translate it in every `<code>.ts` there. Recipe: [docs/how_to/add_text.md](../../docs/how_to/add_text.md).
- translate with a sheet: `bun tools/i18n.ts export <code> sheet.csv`, fill the `translation`
  column, `bun tools/i18n.ts import <code> sheet.csv`. See
  [docs/how_to/translate_text.md](../../docs/how_to/translate_text.md).
- add a language: copy `_template.ts`, add it to `layers.ts`, then fill the text with the sheet.
  See [docs/how_to/add_language.md](../../docs/how_to/add_language.md).
- a streamed module: call `registerText('en', {...})` (and any other languages it has) when it
  loads. Only English is required.
- a version that redraws a window with other words: register them from the version's core module
  (`registerText`, later lines win).
- fix a pack's text: add an entry to `packRepairs.ts`, `itemNames.ts` or `dialogPages.ts` and
  point the language's `dataPack` at it.

## Tests
- `text.golden.test.ts`: a hash of `t(key)` for every key in every language, plus each language's
  metadata. Moving text must leave it unchanged.
- `coverage.test.ts` (rules in `coverage.ts`): every built-in owner has an `en.ts`, every language
  file for every owner, every key translated, no stray keys, every `{hole}` and `%` spec kept, no
  key owned twice.
- `registry.test.ts`: late registration, English then key fallback, overrides, redraw.
- `itemNames.test.ts`: the Spanish item name fixes are wired in, hit the right record of
  `Data/Local/Spn/item_spn.bmd`, change it, and leave no scroll called "Rollo".
- `serverText.test.ts`: every catalogued server message matches itself, keeps its values, free
  text is left alone, and the line shows in the chosen language.
- `tools/i18n.test.ts`: the translator sheet (export, CSV, writing lines back).
