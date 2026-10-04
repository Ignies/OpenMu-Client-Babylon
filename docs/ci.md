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
| Installer | `shellcheck install/*.sh`, `MU_STATE=<tmp> bun install/cli/e2e.ts config` | a script warning, or our compose no longer merges with OpenMU's |

## Structure checks (`tools/checks/index.ts`)

- **Dependency direction** (`tools/checks/rules.ts`): core imports nothing of the game;
  controllers never import modules, the app or content; modules never import windows; windows
  use modules, not the app's state; versions do not reach into the app.
- **Readmes:** every controller, module, content and version folder has a `readme.md`.
- **Doc names:** lowercase `snake_case` (README.md, AGENTS.md, CLAUDE.md excepted).
- **No em-dashes** in code, comments or docs (data files excepted).
- **Controllers through their door:** code outside `src/controllers/<name>/` imports that controller's
  `index.ts` (an interface widget folder is its own door), so a controller can be rewritten behind it.
  Existing deep imports are in `baselines/controller_api.json`, which only shrinks.
- **Servers stay off the client:** no server entry (proxy, register, cash shop, marketplace, ops)
  may load `src/version/index.ts`, `src/app/`, Babylon or React at run time.

## Baselines

Old problems are written down in `tools/checks/baselines/`, so the checks can be strict about new
ones without blocking on old debt. When you fix one, run `bun run check --update` (or
`eslint . -f json | bun tools/checks/lintRatchet.ts --update`) to drop it from the list. A pull
request may shrink a baseline, never grow it.

Tests pin the language to English (src/version/testSetup.ts), so they give the same result on any
machine whatever its system language.
