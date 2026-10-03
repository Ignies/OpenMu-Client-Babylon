# Translate with the sheet

All the text of one language in one spreadsheet, and back into the owner files.

## Export

```
bun tools/i18n.ts export fr fr.csv
```

Columns: `owner` (the folder that owns the line), `key`, `english`, `translation` (the current
line, empty when missing). Without a file name it prints to the screen. Open it in any
spreadsheet (UTF-8 CSV).

## Translate

Fill or fix the `translation` column only. Keep every `{name}` hole and every `%d` / `%s` exactly
as in English: the code fills them. Leave a cell empty to keep the file as it is.

## Import

```
bun tools/i18n.ts import fr fr.csv
```

A changed line is replaced in place (comments and order stay); a missing key is added at the end
of the file; a missing file (`<owner>/i18n/fr.ts`) is created. Rows with an unknown owner or key,
or with different placeholders, are reported. English is edited in the `en.ts` files, not
imported.

## Check

`bunx vitest run src/i18n` (coverage and golden), then `bun run tsc`. The golden hash changes
for the language you touched: update it in the same commit.
