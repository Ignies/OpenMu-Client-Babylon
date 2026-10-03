# Game versions

One client build carries every version in `versions/registry.ts`; the server list picks one per
page load (`src/version/index.ts`). Season 6 Episode 3 (`season6`) is the default; 0.97d
(`v097d`) is the second.

## What a version owns

```
versions/<id>/
  index.ts     the GameVersion: id, label, protocol (packets, encryption), data paths, features
  data/        where its Data/ and converted assets live, file inventory
  packets/     its packet set (most come from versions/shared/packets)
  tables/      its item / skill / monster tables (today they re-export the shared ones)
  ui/          pre-game pages, preload lists, MasterSkillsWindow, and `windows` overrides
```

- `features` flags (`masterSkills`, `socketItems`, `muHelper`, ...) are how `src/`
  asks what a version supports. Never compare the version id in `src/`.
- A version's `ui.windows` replaces shared windows by `id`
  (`versions/shared/ui/index.ts` registers them after the shared ones).
- Shared content (skills, windows, maps) sits in `versions/shared/`. A version that should not
  offer a skill, item or window leaves it out of what it registers.

## Adding a version

1. Copy `versions/_template/` to `versions/<id>/` and fill `index.ts`.
2. Add it to `VERSION_REGISTRY` in `versions/registry.ts`.
3. Point its data paths at its own `Data-<id>/` and `public/game-assets-<id>/`.
4. Override only what differs; everything else comes from `versions/shared/`.
5. `bun run test` runs `versions/registry.test.ts`, which checks every entry loads.
