# Add a string

Text lives with the code that shows it. Find the owner:

- a window, HUD element or page: `versions/shared/ui/{windows,hud,pages}/<name>/i18n/`
- a module's packet or system message: `src/modules/<module>/i18n/`
- a controller's own text: `src/controllers/<controller>/i18n/` (interface widget:
  `src/controllers/interface/components/<widget>/i18n/`)
- used by several owners: the lowest layer that uses it, else `versions/shared/ui/i18n/`,
  `src/modules/_shared/i18n/` or `src/i18n/text/` (see `src/i18n/readme.md`).

## Steps

1. Add the key to the owner's `i18n/en.ts`. Keys are `area.thing`; `{name}` holes are filled by
   `t(key, { name })`.
2. Add the same key to every other `<code>.ts` in that folder. No translator at hand: fill them
   later with the sheet ([translate_text.md](translate_text.md)); until then the coverage test
   fails and the screen shows English.
3. Use it: `import { t } from '@/i18n'; t('party.invite')`. The key is type-checked, nothing else
   to register.

## A new owner folder

Create `i18n/en.ts` like any existing one (copy `src/modules/party/i18n/en.ts`): a `const en`, its
default export, and the `declare module '@/i18n'` block that adds the folder to `TextOwners`
(`'<owner folder>': typeof en`). Then
one `<code>.ts` per language (`satisfies Partial<Record<keyof typeof en, string>>`). The engine
finds the folder by glob.

## A streamed module

Its text is not in the repo: call `registerText('en', { ... })` (and other languages if it has
them) when it loads, and cast its keys (`'mymod.title' as TextKey`). Only English is required;
missing languages show English.

## Check

`bunx vitest run src/i18n` (coverage, golden, registry). The golden hash changes when English or
a translation changes: update it in the same commit and say why.
