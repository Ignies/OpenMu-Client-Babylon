# Give a controller a new look without losing the classic one

Example: a new loading screen.

1. The classic one is `src/controllers/loading/classic/`. Leave it as it is.
2. Add the new one next to it: `src/controllers/loading/<name>/` with the same exports.
3. Choose between them in one place: the version (`versions/<id>/`) or an option in
   `src/features/options/gameOptions.ts`, read where the loading screen is mounted
   (`src/app/App.tsx`).
4. Test both: the classic path must render exactly as before.

The same applies to any controller: effects, lighting and rendering already keep their graded
looks as separate branches chosen by Options, with the classic path untouched.
