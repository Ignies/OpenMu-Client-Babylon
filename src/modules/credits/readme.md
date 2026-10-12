# credits

Who made the client: the projects it stands on (special thanks), the people who wrote it, the
people who reported its bugs and the playtesters, read from GitHub. One list for the landing's
credits (`versions/shared/ui/pages/preloader/backdrop.tsx`) and the Ctrl+F8 credits window
(`versions/shared/ui/windows/project_credits/`).

Protected: this loader, its GitHub sources, the contributor mark and their notices must stay as
they are ([LICENSE](../../../LICENSE), "Additional condition"; [AGENTS.md](../../../AGENTS.md), "Credits").
`tools/checks/credits.ts` checks it.

## Public API
- `index.ts` (the door): `loadCredits()` (the list in its running order), type `Credit`,
  `ContributorMarks` (`request()`, `isMarked(name)`, `version`: who wears the contributor mark).

## How it works
- `contributors.ts` reads the repository's contributors (commits) and issues (reports) and
  OpenMU's contributors (the roll under its thanks) from the GitHub API. The special thanks and
  the playtesters by name are lists in the file; everyone else who played along closes the list.
- The lists are kept a day in `localStorage` (`mu_credits_v3`); when GitHub cannot be reached the
  last kept lists are used, else the thanks alone. GitHub allows a visitor sixty calls an hour, so
  issues are read three pages at most.
- `module.ts`: a core module with no packets; nothing is fetched until a page or window asks.
- `marks.ts`: the contributor mark. Every contributor with commits is marked; a character of that
  name (any case) wears an angelic halo and a white aura, drawn by `ecs/systems/contributorMark.ts`
  (from `AppearanceSystem`) with `controllers/actors/contributorMark.ts`, on every preset. The list
  is read once, from the same loader and day cache as the window.
- The match is by name, so anyone can name a character like a contributor and wear the mark. The
  hook for a stricter mapping is `CONTRIBUTOR_CHARACTERS` in `marks.ts`: a contributor's login to
  the character names that may wear their mark; a contributor listed there is matched by those
  names only.

## Depends on / used by
- uses: `fetch`, `localStorage`.
- used by: the landing (`pages/preloader/backdrop.tsx`), the Ctrl+F8 window, `ecs/systems/contributorMark.ts`.

## Change it
- thank a project or a person: `SPECIAL_THANKS` in `contributors.ts`; a playtester: `PLAYTESTERS`.
- tie a contributor to their characters (stop name spoofing for them): `CONTRIBUTOR_CHARACTERS` in `marks.ts`.

## Tests
- `contributors.test.ts`: the running order, the one-day cache, the fallback when GitHub is down.
- `marks.test.ts`: who is marked, the character list hook, one read of the credits.
