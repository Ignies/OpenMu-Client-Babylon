# credits

Who made the client: the projects it stands on (special thanks), the people who wrote it, the
people who reported its bugs and the playtesters, read from GitHub. One list for the landing's
credits (`versions/shared/ui/pages/preloader/backdrop.tsx`) and the Ctrl+F8 credits window
(`versions/shared/ui/windows/project_credits/`).

Protected: this loader, its GitHub sources and its notice must stay as they are ([LICENSE](../../../LICENSE),
"Additional condition"; [AGENTS.md](../../../AGENTS.md), "Credits"). `tools/checks/credits.ts` checks it.

## Public API
- `index.ts` (the door): `loadCredits()` (the list in its running order), type `Credit`.

## How it works
- `contributors.ts` reads the repository's contributors (commits) and issues (reports) and
  OpenMU's contributors (the roll under its thanks) from the GitHub API. The special thanks and
  the playtesters by name are lists in the file; everyone else who played along closes the list.
- The lists are kept a day in `localStorage` (`mu_credits_v3`); when GitHub cannot be reached the
  last kept lists are used, else the thanks alone. GitHub allows a visitor sixty calls an hour, so
  issues are read three pages at most.
- `module.ts`: a core module with no packets; nothing is fetched until a page or window asks.

## Depends on / used by
- uses: `fetch`, `localStorage`.
- used by: the landing (`pages/preloader/backdrop.tsx`), the Ctrl+F8 window.

## Change it
- thank a project or a person: `SPECIAL_THANKS` in `contributors.ts`; a playtester: `PLAYTESTERS`.

## Tests
- `contributors.test.ts`: the running order, the one-day cache, the fallback when GitHub is down.
