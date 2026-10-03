# Content

Content is what a game version loads: skills, windows, maps, monsters, npcs, items. It lives in
`versions/shared/` (and in `versions/<id>/` when one version differs). Each piece is one file or
one folder, and it calls the controllers instead of copying their data.

## Skills

```
versions/shared/skills/<class>/<skill>/
  index.ts          export default defineSkill({ id, name, visual, light, sound, clip, ... })
  strengthener.ts   a master variant: its own defineSkill, sitting next to its base
  mastery.ts        another variant
  charge.ts ...     logic only this skill has (Nova's charge, Combo's knock-up, Dark Side)
```

- Classes: `dark_wizard dark_knight fairy_elf magic_gladiator dark_lord summoner rage_fighter`,
  plus `monsters` (monster-only skills) and `common` (skills every class or no class has).
- A skill several classes share lives with the first class in its server definition.
- Helpers used by several skills of one class sit in `<class>/_shared.ts`; helpers several
  classes share sit in `skills/_shared.ts`.
- `versions/shared/skills/index.ts` finds every skill file by glob and registers it. Adding a
  skill is adding a file.
- Fields of `defineSkill` (`src/controllers/skills/define.ts`):

| Field | Controller | What |
|---|---|---|
| `visual` | skills / fx | cast, travel, impact, area steps; `enhanced` for the graded tiers |
| `light` | lighting | the light it throws |
| `sound` | sound | cast sound |
| `clip` | combat / anim | cast animation, on foot and per mount |
| `delayMs` | features/skills | re-use delay |
| `target` | combat | who the cast goes to when its type would say otherwise |
| `stepIn` | combat | walk one square in toward the target |
| `buffs`, `buffArrivals` | skills | persistent buff looks and their landing work |
| `combat` | combat | a layer and hooks for state only this skill has |

Golden tests (`versions/shared/skills/*.golden.test.ts`) record what every skill id does. A change
that alters a skill's look, sound or rules shows up there; update the snapshot only when the change
is meant (`bunx vitest run versions/shared/skills -u`, and say why in the PR).

## Windows and HUD

```
versions/shared/ui/windows/<window>/
  index.tsx    draws the window (only drawing)
  window.ts    export default defineWindow({ id, slot, order, component })
  layout.ts    geometry   style.less   readme.md (when the window has rules worth writing down)
versions/shared/ui/hud/<element>/      same shape, for always-on elements
versions/shared/ui/pages/<page>/       login, server select, character select, preloader, world
```

Shared widgets (item tooltip, item grid, picked item, frames, buttons, text, cursor, message box)
are the interface controller's: `src/controllers/interface/components/`. A window uses them;
restyling the tooltip once restyles it everywhere.

## Maps, monsters, npcs, items

- `maps/<map>/`: the map's spec, its object classes (one file per object type) and `create.ts`.
- `monsters/<name>/index.ts`: one folder per monster or npc type (`defineMonster`: number, name,
  max health, the original table row), found by glob; plus model classes for the ones with their
  own look. `npcs/`: npc model classes.
- `items/<group>/<item>.ts`: one file per item (`defineItem`), found by glob; plus item-driven looks
  (`launcher_arrows.ts`).
- An area's master controller (`src/controllers/items`, `src/controllers/monsters`) owns the record
  type, the `define*` function and the registry; the files are the components that use it.

## Versions

`versions/<id>/` holds what differs for one version: data paths, packet set, UI overrides (same
window `id` replaces the shared one). Code in `src/` never asks which version runs; it reads the
version's features and data. See [versions.md](versions.md).

A version's own page reuses the shared page's parts instead of copying them: the 0.97d character
page draws `versions/shared/ui/pages/character_select/character_list` as rows, the shared page draws
it as the 3D line-up's name plate.

## Animations

- `animations/<action>.ts`: one file per player clip (`defineAnimation`: the PlayerAction id, its
  name, speed rule and flags), found by glob. The PlayerAction enum is generated from them
  (`bun versions/shared/animations/write_enum.ts`).
- `animations/monster_swings/`, `animations/monster_casts/`: the skill-keyed swing rules of some
  monsters and what each skill plays on a monster caster.
- The master controller is `src/controllers/anim`: the record, the registry and every lookup.

## NPCs in the monster folders
- An NPC is a monster folder like any other (`versions/shared/monsters/<name>/`). Its look and
  noise are optional fields of `index.ts` (types in `src/controllers/monsters/npc.ts`): `hidden`,
  `npcModel`, `gear`, `transformed`, `trap`, `voice`, `globalVoice`. A class of its own is
  `<name>/model.ts`; a class several types share is `_<line>/model.ts`.
- The generic NPC shapes (plain model, player rig in a kit, transformed rig, trap, hidden) are the
  actors controller's. `versions/shared/npcs/` only keeps the archangels (until the fx door exports
  `TerrainDecal`) and two forwarding files for older readers.
