# Add a language

1. `cp src/i18n/_template.ts src/i18n/<language>.ts`; set `name`, `code` (BCP-47, the text file
   name), `aliases`, `label` (its own name), `region` (the flag), `font` for scripts Tahoma lacks,
   `direction: 'rtl'` for a script read from the right, and `dataPack` if `Data/Local` has a folder
   for it. The pack's `encoding` is the language's Windows code page; UTF-8 when none holds the
   script (CJK, Persian, Urdu), or `x-mu-devanagari` / `x-mu-bengali` where UTF-8 would not fit the
   30 byte name fields (`controllers/assets/readme.md`).
2. Add `<language>Layer` to `src/i18n/layers.ts`. A new region also needs `FlagRegion`
   (`src/i18n/layer.ts`) and a flag in `src/controllers/interface/components/mu_flag`.
3. Export the sheet and translate it ([translate_text.md](translate_text.md)):
   `bun tools/i18n.ts export <code> <code>.csv`, fill `translation`, then
   `bun tools/i18n.ts import <code> <code>.csv`. That creates `i18n/<code>.ts` in every owner
   folder.
4. `bunx vitest run src/i18n`: the coverage test lists any line still missing; add the new code
   to the golden test's hashes.
5. The pack: add the language to `GENERATED_PACKS` (`tools/localPacks.ts`) and its face to
   `FACES` (`tools/mapBanners.ts`), add `tools/packs/<tag>.json` and its column in `banners.json`,
   `questWords.json` and `packTexts.json`, then run `node tools/localPacks.ts --only <tag>`, and
   the same for `mapBanners.ts`, `questWords.ts` and `packTexts.ts` (tools/readme.md).
