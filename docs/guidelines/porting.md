# Porting: 1:1 first

The goal is the classic MU Online feel, version by version. Improvements come after the original
is matched, and never replace it.

- **Read the original before writing.** The reference clients live outside this repo
  (`references/` in the workspace); the sources marked as preferred take priority.
- **Port constants as they are.** Keep the original numbers and units, convert at the edge
  (`cm(50)`, `ticks(10)`, `perTick(50)` in the skill engine).
- **Cite the source** next to the ported logic, one short line: `// ZzzCharacter.cpp:4485`.
  Longer notes go in the folder's `readme.md`.
- **One version at a time.** Season 6 Episode 3 behaviour goes in shared content; a version that
  differs overrides in `versions/<id>/`.
- **New looks are additions.** A graded or modern look sits behind an option or a separate
  controller implementation; the classic path stays byte for byte what it was.
- **When unsure, match the screenshot.** Compare against the original client's screenshots before
  calling a port done.
