# Test-driven development

Every change starts with a test that fails, then the least code that makes it pass, then a
cleanup with the test still green.

## The loop

1. **Red.** Write the test next to the code: `foo.ts` -> `foo.test.ts`. Run only it:
   `bunx vitest run path/to/foo.test.ts`. It must fail for the reason you expect.
2. **Green.** Change the code until it passes. Nothing more.
3. **Refactor.** Shorten and clean with the test green. Then `bun run test`, `bun run tsc`,
   `bun run check`.

## What to test

- **Pure rules first.** Split decisions (which clip, which sound, how much damage, which slot) into
  plain functions with no Babylon objects, and test those. `propBatchRules.ts` next to
  `propBatches.ts` is the pattern.
- **Packets.** A feature's `net.ts` reacts to packets: build the packet bytes, emit them on the
  event bus, assert the feature's state.
- **Babylon code.** Use `NullEngine` and a `Scene` (see `versions/shared/skills/*.golden.test.ts`
  and `src/controllers/render/staticClips.test.ts`). Spy on a controller facade
  (`vi.spyOn(effects, 'spawn')`) to see what was asked for.
- **Time.** Effects run on their own clock: step it (`effects.update(map, dt)`) instead of waiting.
- **Randomness.** Seed `Math.random` in the test so the result repeats.

## Before moving or splitting code

Write a characterization test first: one that records what the code does today, right or wrong.
Then move. The test must still pass after the move; if it changes, the move changed behaviour.
The skill golden tests are the model:

- `skillVisuals.golden.test.ts` runs every skill id's visuals headless at the classic and top
  tiers, and every buff look and bow shot, and snapshots what it spawns.
- `skillTables.golden.test.ts` snapshots each id's sound, clip, light, target, step-in and delay.

Snapshots are hashes so they stay small. `GOLDEN_FULL=1 bunx vitest run versions/shared/skills`
writes the full traces when you need to see what changed.

## What not to do

- No test that only checks a mock was called with what the code just passed it.
- No sleeping in tests; step clocks and timers.
- No test that needs the network or a running server.
- Do not update a snapshot to make a red test green unless the change in behaviour is the point;
  say so in the PR.
