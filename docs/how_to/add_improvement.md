# Add an improvement

An improvement is a deliberate change from the original client that the player can turn off. The
Fidelity option's Classic preset runs the original 1:1; Enhanced and Ultra turn improvements on.

A fix that makes the client match the original is not an improvement: just fix it.

## Steps

1. Add `versions/shared/improvements/<id_in_snake_case>.ts`:

   ```ts
   import { defineImprovement } from '@/controllers/fidelity';

   /** What it does. Classic: what the original does (File.cpp:line). Read in <site>. */
   export default defineImprovement({
     id: 'myImprovement',
     preset: 'enhanced', // or 'ultra'
     labelKey: 'fidelity.myImprovement',
     hintKey: 'fidelity.myImprovement.hint',
   });
   ```

   The glob in `all.ts` finds it; there is no list to edit.
2. Add `fidelity.myImprovement` (a short label) and `fidelity.myImprovement.hint` (what it does,
   then "Classic: ...") to `versions/shared/improvements/i18n/en.ts` and every other language
   there ([add_text.md](add_text.md)).
3. At the site, keep the original path and read the flag:
   `import { isOn } from '@/controllers/fidelity';` then `if (isOn('myImprovement')) ...`.
   In per-frame code read it once per frame, outside loops.
4. Add a row to the table in `versions/shared/improvements/readme.md` and a test that the site
   runs the original on Classic (`setFidelityChoice(FIDELITY_CLASSIC, {})`, then back to
   `FIDELITY_DEFAULT` after the test).

The Options window's Fidelity page shows the new check by itself.
