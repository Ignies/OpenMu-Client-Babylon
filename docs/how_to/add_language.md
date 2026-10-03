# Add a language

1. `cp src/i18n/_template.ts src/i18n/<language>.ts`; set `name`, `code` (BCP-47, the text file
   name), `aliases`, `label` (its own name), `region` (the flag), `font` for scripts Tahoma lacks,
   and `dataPack` if `Data/Local` has a folder for it.
2. Add `<language>Layer` to `src/i18n/layers.ts`. A new region also needs `FlagRegion`
   (`src/i18n/layer.ts`) and a flag in `src/controllers/interface/components/mu_flag`.
3. Export the sheet and translate it ([translate_text.md](translate_text.md)):
   `bun tools/i18n.ts export <code> <code>.csv`, fill `translation`, then
   `bun tools/i18n.ts import <code> <code>.csv`. That creates `i18n/<code>.ts` in every owner
   folder.
4. `bunx vitest run src/i18n`: the coverage test lists any line still missing; add the new code
   to the golden test's hashes.
