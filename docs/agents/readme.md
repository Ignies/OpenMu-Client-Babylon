# Agents

How an agent (AI or human) works on this repo. [AGENTS.md](../../AGENTS.md) is the short entry point
every agent tool loads; this folder is the detail behind it.

| Read | When |
|---|---|
| [workflow.md](workflow.md) | every task: the steps from reading to a pull request |
| [roles.md](roles.md) | a multi-agent session: who owns what (porter, builder, integrator, reviewer) |
| [tools.md](tools.md) | moving files, finding dead code, proving a refactor changed nothing |
| [where_things_are.md](where_things_are.md) | "where is X?" in one table |
| [../how_to/](../how_to/) | recipes for the common changes |
| [../guidelines/](../guidelines/) | TDD, porting, performance, code style, git |

## The five things an agent must not get wrong

1. **Behaviour stays 1:1** with the classic client unless the task says otherwise. Golden tests and the
   original source (cited as `File.cpp:line`) are how you know.
2. **Test first.** No change without a test that failed before it and passes after it.
3. **Dependencies point down:** content -> modules -> controllers -> core. `bun run check` enforces it.
4. **One thing, one place.** A skill's data lives in its skill file, a window's drawing in its window
   folder, a packet's handling in its module's `net.ts`.
5. **No AI attribution, no em-dashes, short commits.** CI rejects all three.
