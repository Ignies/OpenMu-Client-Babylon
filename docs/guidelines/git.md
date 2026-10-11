# Commits and pull requests

- **Commits:** a subject of 72 characters or less, imperative, saying what changed. A body only when
  the why is not obvious, three lines at most.
- **Pull requests:** use the template. In first person, plainly: the problem found, the fix
  applied, and possible improvements. Do not reference internal docs or screenshots in the text.
- **Moves and edits apart.** A commit that moves files does nothing else, so git keeps the history
  (`bun tools/restructure/move.ts <moves.json>` moves and fixes imports).
- **No AI attribution:** no `Co-Authored-By`, no "Generated with". CI rejects them.
- **No em-dashes.** CI rejects them in commit messages.

Example PR text:

> Problem found: Sebina (NPC 235) owns quests 0 and 1. The lookup returned the first quest she
> owns, so after the Scroll of Emperor she reopened its finished page forever.
>
> Fix applied: it now walks the chain in the class's order and returns her first unfinished quest.
