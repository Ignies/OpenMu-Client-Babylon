# shared

Content any game version can load. Each piece is one file or one folder that calls the
controllers instead of copying their data. Overview: [docs/content.md](../../docs/content.md).

## Public API
Each subfolder has its own readme:

| Folder | What |
|---|---|
| `skills/` | one folder per skill (`defineSkill`), found by glob; the server skill table |
| `ui/` | windows, HUD elements and pages, found by glob from each `window.ts` |
| `maps/` | one folder per map (`MapLayer`), listed in `maps/layers.ts` |
| `monsters/` | one folder per monster or npc type (`defineMonster`), its `model.ts` when it has its own look |
| `monster_models/` | one file per monster body (`defineMonsterModel`) |
| `animations/` | one file per player clip (`defineAnimation`); monster swing and cast rules |
| `items/` | one file per item (`defineItem`) and per-launcher arrow looks |
| `objects/` | world object model numbers and the signpost labels |
| `packets/` | generated packet codecs (`bun run generate`) |

## How it works
- Content imports controllers (`@/controllers/*`), core and, where it must, modules. A
  controller exposes a registry or a hook slot that content fills (`registerSkills`,
  `registerWindows`, `MAP_LAYERS`).
- A version takes what it needs from here and overrides in `versions/<id>/` (same window `id`
  replaces the shared one).

## Depends on / used by
- uses: `src/controllers`, `src/core`, `src/modules`, `src/ecs`
- used by: `versions/season6`, `versions/v097d`, and many `src/` modules through `@versions/shared/*`

## Change it
- add a skill: [docs/how_to/add_skill.md](../../docs/how_to/add_skill.md)
- add or change a window: [docs/how_to/change_a_window.md](../../docs/how_to/change_a_window.md)
- anything that differs per version goes in `versions/<id>/`, not here.

## Tests
- See each subfolder's readme.
