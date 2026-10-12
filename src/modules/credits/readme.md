# credits

Who made the client: the projects it stands on (special thanks), the people who wrote it, the
people who reported its bugs and the playtesters, read from GitHub. One list for the landing's
credits (`versions/shared/ui/pages/preloader/backdrop.tsx`) and the Ctrl+F8 credits window
(`versions/shared/ui/windows/project_credits/`).

Protected: this module, its GitHub sources, every visual it draws for contributors and their notices must stay as
they are ([LICENSE](../../../LICENSE), "Additional condition"; [AGENTS.md](../../../AGENTS.md), "Credits").
`tools/checks/credits.ts` checks it.

## Public API
- `index.ts` (the door): `loadCredits()` (the list in its running order), type `Credit`,
  `CreditsRoll` (`request()`, `isCredited(name)`, `version`: who is credited).

## How it works
- `contributors.ts` reads the repository's contributors (commits) and issues (reports) and
  OpenMU's contributors (the roll under its thanks) from the GitHub API. The special thanks and
  the playtesters by name are lists in the file; everyone else who played along closes the list.
- The lists are kept a day in `localStorage` (`mu_credits_v3`); when GitHub cannot be reached the
  last kept lists are used, else the thanks alone. GitHub allows a visitor sixty calls an hour, so
  issues are read three pages at most.
- `module.ts`: a core module with no packets; nothing is fetched until a page or window asks.
- `roll.ts`: every contributor with commits is credited, by character name (any case), read once from
  the same loader and day cache as the window; `ecs/systems/creditsAccent.ts` and
  `controllers/actors/creditsAccent.ts` use it on every preset. `CREDITED_CHARACTERS` ties a
  contributor's login to their character names; one listed there is matched by those names only.

## Depends on / used by
- uses: `fetch`, `localStorage`.
- used by: the landing (`pages/preloader/backdrop.tsx`), the Ctrl+F8 window, `ecs/systems/creditsAccent.ts`.

## Change it
- thank a project or a person: `SPECIAL_THANKS` in `contributors.ts`; a playtester: `PLAYTESTERS`.
- tie a contributor to their characters: `CREDITED_CHARACTERS` in `roll.ts`.

## Tests
- `contributors.test.ts`: the running order, the one-day cache, the fallback when GitHub is down.
- `roll.test.ts`: who is credited, the character list hook, one read of the credits.
