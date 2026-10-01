# Tools for agents

## Checks (`tools/checks/`)
| Command | What it does |
|---|---|
| `bun run check` | dependency direction (`rules.ts`), readme per folder, doc names, no em-dash |
| `bun run check --update` | drops fixed entries from the baselines (they only shrink) |
| `bun run check:lint` | ESLint counts per rule against `baselines/lint.json` |
| `bun run check:commits origin/main` | commit subjects, em-dashes, attribution |
| `bun tools/checks/baselineGuard.ts origin/main` | fails if a baseline file grew |
| `bun tools/checks/unusedExports.ts [prefix]` | exports no other file mentions (dead-code hints) |

## Refactoring (`tools/restructure/`)
| Command | What it does |
|---|---|
| `bun tools/restructure/move.ts moves.json [--dry-run]` | moves files or folders and rewrites every import to them |
| `bun tools/restructure/aliasImports.ts` | turns long or cross-root relative imports into `@/` / `@versions/` |
| `bun tools/restructure/dropUnusedImports.ts <dirs>` | removes import specifiers tsc reports unused |
| `bun tools/restructure/deleteDeadExports.ts <list>` | deletes the exports listed by `unusedExports.ts` |
| `bun tools/restructure/commentsOnly.ts [ref]` | proves the working-tree edits changed comments only |
| `bun tools/restructure/checkHomes.ts` | every skill file sits where its id belongs |

## Behaviour nets
- `versions/shared/skills/skillVisuals.golden.test.ts`: what every skill id spawns and lights, at the
  classic and top tiers, plus buff looks and bow shots.
- `versions/shared/skills/skillTables.golden.test.ts`: each id's sound, clip, light, target, step-in, delay.
- `GOLDEN_FULL=1 bunx vitest run versions/shared/skills` writes full traces to see what changed.

## Running the game
- `bun run dev`, then open `/?offline`: a test character in Lorencia, no server needed.
- `window.__skillVisuals.area(id)` / `.targeted(id)` / `.buff(effectId)` casts any skill look by hand.
- Restart the dev server after moving many files: a long-running one can keep two copies of a
  controller and draw unlit (black) models until restarted.
