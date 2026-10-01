# Agent guide

A MU Online client (TypeScript + Babylon.js, Vite + Bun) that ports the classic game 1:1,
version by version (Season 6 Episode 3 first). Read this file before changing anything.
Details live next to the code: every folder has a `readme.md`.

## The shape of the code

```
src/            engine: the same for every game version
  app/          boot, store, the list of packet handlers (logic.ts), map-change reset (lifecycle.ts)
  core/         small pure helpers: types, math, event bus, storage
  controllers/  one folder per controller; the game starts them from controllers.ts
  features/     one folder per gameplay feature: net.ts (packets in), state, actions
  ecs/          the entity world and its per-frame systems
  ui/           React shell (windows are moving to versions/shared/ui, see docs/file_tree.md)
  version/      the version seam: which game version is running
versions/       content, per game version
  shared/       content any version can load: skills, items, monsters, npcs, maps, objects, packets
  season6/      Season 6 Episode 3: data paths, packet set, ui overrides
  v097d/        0.97d
  registry.ts   every version the client ships
tools/          converters, codegen, restructure and check scripts
docs/           how things fit together and how to change them
```

Full tree with one line per folder: [docs/file_tree.md](docs/file_tree.md).

## The three rules of the layout

1. **Controllers are generic.** A controller (sound, fx, lighting, weather, item_fx, loading,
   anim, render, camera, terrain, assets, net, interface, combat, skills) knows *how* to play a
   sound or spawn an effect, never *which* skill or item does it. Each one is a folder with an
   `index.ts` facade. See [docs/controllers.md](docs/controllers.md).
2. **Content owns its data.** A skill, item, monster or map object is one file (or folder) under
   `versions/shared/` that calls the controllers. Nothing about Nova lives outside
   `versions/shared/skills/dark_wizard/nova/`. See [docs/content.md](docs/content.md).
3. **Dependencies point down.** `versions/*` content -> `src/features` -> `src/controllers` ->
   `src/core`. A controller never imports content or a feature; it exposes a registry or a hook
   slot that content fills (`registerSkills`, `combat/skillHooks.ts`).

## Where a change goes

| I want to... | Edit |
|---|---|
| change how a skill looks, sounds, lights or animates | `versions/shared/skills/<class>/<skill>/index.ts` |
| change a master variant (Strengthener, Mastery) | the sibling file in the same folder |
| add a skill | add `<class>/<skill>/index.ts` with `export default defineSkill({...})`; it is found by glob |
| change how all effects / sounds / lights work | the controller folder in `src/controllers/` |
| handle a new packet | `src/features/<feature>/net.ts` (import order lives in `src/app/logic.ts`) |
| add a texture pack | build it into `public/packs/<pack>/`, list it in `public/packs/index.json` |
| change one version only | `versions/<id>/` (override), never an `if (version)` in `src/` |

More recipes: [docs/how_to/](docs/how_to/).

## How to work (test first)

1. Read the folder's `readme.md` and the original client source it cites (`references/`).
2. Write or extend a test that shows the change (red). Tests sit next to the code as `*.test.ts`.
3. Make it pass with the least code (green). Prefer deleting code to adding it.
4. Run the checks below. All must pass.
5. Before moving or splitting code, add a characterization test first. The skill golden tests
   (`versions/shared/skills/*.golden.test.ts`) are the model: they snapshot what every skill
   does, so a refactor that changes behaviour fails.

Full guide: [docs/guidelines/tdd.md](docs/guidelines/tdd.md).

## Checks

```
bun install
bun run tsc          # type check
bun run test         # vitest (client + tools)
bun run test:server  # bun test for the marketplace service
bun run lint         # eslint; CI fails if any rule's count rises (tools/checks)
bunx vite build      # production build
```

CI runs the same set on every pull request: [docs/ci.md](docs/ci.md).

## Rules that are never broken

- **1:1 first.** Match the classic client before improving it. Cite the original
  (`ZzzCharacter.cpp:4485`) next to ported logic. New looks go behind an option or a new
  controller implementation; the classic one is never edited to add a feature.
- **Less code wins.** If the same behaviour fits in fewer lines, use fewer lines.
- **Short code comments.** One or two lines in the file; the why and the history go in the
  folder's `readme.md`.
- **Performance.** No allocation or scene walks in per-frame code, no new render pass or
  material recompile without a measured reason. See [docs/guidelines/performance.md](docs/guidelines/performance.md).
- **No AI attribution** in commits, pull requests or files. No `Co-Authored-By`, no
  "Generated with" lines.
- **No em-dashes** in code, comments, commits or docs. Use `-`.
- **Commits and PRs are short:** say what was wrong and what changed, three lines at most,
  first person.
- **Docs file names are lowercase `snake_case`** (except `README.md`, `AGENTS.md`, `CLAUDE.md`).
