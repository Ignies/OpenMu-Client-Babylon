# Roles in a multi-agent session

When several agents work at once, each takes one role and stays inside its folders. Two agents never
edit the same file at the same time.

## Porter
Brings a behaviour over from the original client.
- Owns: the content or feature folder of the thing being ported.
- Reads the original source first; ports constants as they are; cites `File.cpp:line`.
- Writes the test from the original's behaviour (numbers, order, timing), then the code.

## Builder
Builds or changes one module.
- Owns: exactly one folder (a skill, a window, a feature, a controller implementation).
- Never edits another module's folder. Needs a change in a shared or core file: asks the integrator.
- Leaves the folder's `readme.md` and tests matching the code.

## Integrator
The only role that edits shared seams.
- Owns: `src/core/`, `src/app/` (boot, store, logic.ts order, lifecycle), controller contracts
  (`controller.ts`, `define.ts`, `windows.ts`, `skillHooks.ts`), `versions/registry.ts`.
- Applies builders' requests one at a time, runs every check after each.

## Reviewer
Writes no code. Checks a change against the rules and the original.
- Runs every check; reads the diff for: behaviour change without a test, a dependency pointing up,
  a long comment that belongs in the readme, missing source refs, dead code left behind.
- For visible changes: compares in-game screenshots with the original client's.
- Reports findings ranked by severity, with `file:line`.

## Hand-offs
- Builder -> integrator: "I need `<seam>` to expose `<thing>`", with the reason and a test.
- Builder/porter -> reviewer: the branch, the test that proves it, what to look at in game.
- Reviewer -> builder: the findings; the builder fixes and asks again.
