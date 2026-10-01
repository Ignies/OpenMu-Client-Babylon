# Workflow: from task to pull request

## 1. Understand
- Read [AGENTS.md](../../AGENTS.md), then the `readme.md` of every folder the task touches.
- Find the code with [where_things_are.md](where_things_are.md). Trace the behaviour to `file:line`.
- For anything ported, read the original client source and note the lines you will cite.
- Write down, before changing anything: what is wrong (or missing), where, and why.

## 2. Pin the current behaviour
- If code will move or be restructured: add or run a characterization test first (the skill golden
  tests are the model). It must pass before and after.
- If behaviour will change: write the test that shows the new behaviour. Run it; it must fail.

## 3. Change
- Smallest change that makes the test pass, in the folder that owns the thing.
- New controller look: a sibling implementation, never an edit of the classic one.
- Moving files: `bun tools/restructure/move.ts moves.json`, in a commit of its own.

## 4. Verify
```
bun run tsc
bun run test            # includes the skill golden tests
bun run test:server
bun run check           # dependency direction, readmes, doc names, no em-dash
bun run check:lint      # lint may not get worse
bunx vite build
```
For anything visible, run the game (`bun run dev`, `?offline` boots a test character with no
server) and look at it. Restart the dev server after a large move.

## 5. Document
- Update the folder's `readme.md` when its API, flow or "change it" steps changed.
- Long explanations go in the readme, not in the file. Keep the original source refs in the code.
- A new folder gets a `readme.md` (CI checks it).

## 6. Commit and open the pull request
- Commits: subject of 72 characters or less, what changed; no AI attribution; no em-dashes.
- PR: fill the template; in first person, plainly: problem found, fix applied, possible improvements.
- CI must be green. A baseline (lint, dependency, readme) may shrink, never grow.

## Done means
The test that proves the change passes, every check above passes, the readme says what the code does,
and someone reading only the PR text understands what changed and why.
