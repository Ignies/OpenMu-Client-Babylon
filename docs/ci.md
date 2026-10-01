# CI

`.github/workflows/ci.yml` runs on every push to `main` and every pull request. The same checks
run locally:

| Job | Local command | Fails when |
|---|---|---|
| TypeScript | `bun run tsc` | a type error |
| Tests | `bun run test` and `bun run test:server` | a test fails, including the skill golden tests |
| Build | `bun run build` and `bun run build:register` | the client or the register page does not build |
| Lint ratchet | `bun run check:lint` | any ESLint rule has more problems than `tools/checks/baselines/lint.json` |
| Structure | `bun run check` | see below |
| Baselines (PR) | `bun tools/checks/baselineGuard.ts origin/main` | a baseline file grew |
| Commits (PR) | `bun run check:commits origin/main` | a subject over 72 characters, an em-dash, or AI attribution |

## Structure checks (`tools/checks/index.ts`)

- **Dependency direction** (`tools/checks/rules.ts`): core imports nothing of the game;
  controllers never import features, the app or content; features never import windows; windows
  stop reaching into the Store; versions do not reach into the app.
- **Readmes:** every controller, feature, content and version folder has a `readme.md`.
- **Doc names:** lowercase `snake_case` (README.md, AGENTS.md, CLAUDE.md excepted).
- **No em-dashes** in code, comments or docs (data files excepted).

## Baselines

Old problems are written down in `tools/checks/baselines/`, so the checks can be strict about new
ones without blocking on old debt. When you fix one, run `bun run check --update` (or
`eslint . -f json | bun tools/checks/lintRatchet.ts --update`) to drop it from the list. A pull
request may shrink a baseline, never grow it.

Tests pin the language to English (src/version/testSetup.ts), so they give the same result on any
machine whatever its system language.
