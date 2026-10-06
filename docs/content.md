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
| `delayMs` | combat (read by modules/skills) | re-use delay |
| `target` | combat | who the cast goes to when its type would say otherwise |
| `stepIn` | combat | walk one square in toward the target |
| `buffs`, `buffArrivals` | skills | persistent buff looks and their landing work |
| `combat` | combat | a layer and hooks for state only this skill has |

Golden tests (`versions/shared/skills/*.golden.test.ts`) record what every skill id does. A change
that alters a skill's look, sound or rules shows up there; update the snapshot only when the change
is meant (`bunx vitest run versions/shared/skills -u`, and say why in the PR).

### Skill-only rules (more `defineSkill` fields)

Anything a controller does differently for one skill is a field of that skill's file; no
controller tests a skill number.

| Field | Controller | What |
|---|---|---|
| `lookAliases`, `masterAliases` | skills (+ combat, sound, lighting) | master numbers drawn as this skill; `masterAliases` also cast, sound and light as it |
| `clip` as a function | combat | a pick of its own: the map (Fire Breath), a coin toss (Rage Fighter party buffs) |
| `poseClip`, `swing`, `swordCount`, `castsAsSpell` | combat | clip by hands or SwordCount (Plasma Storm, Slash), the high bow swing (Starfall), SwordCount, `SetPlayerMagic` for a physical-typed master |
| `othersSee`, `quietOn`, `magicIsHit` | combat | the clip others play (Electric Spike on a horse); mounts that drop the cast (Defense on a horse); a 0x19 that is a hit, no clip or sound (Dragon Roar) |
| `noFlinch`, `holdsFacing` | combat | clips a hit does not cut; clips that keep the facing |
| `kill` | combat | what a kill does to the body (`knock`, per-frame `dying`: Nova, Combo) |
| `explicitHits` | combat | send the 0xDB hit list whatever the skill type |
| `clipSound`, `soundOnLanding`, `silentHeroCast`, `targetSound` | sound | cast sound by clip; sound at the landing; no sound at the hero's click; a sound the hero's click makes with a target only |
| `effect`, `effectAliases` | modules/skills | the MagicEffect `MagicEffectCancelled` drops for this skill, and the master numbers that drop it too (ours: skills readme) |
| `cancel` | skills | work its cancel does on the target first, and other effects it drops (`cancelledEffects`) |
| `buffHits` | skills | what a buff draws when its wearer is hit (Soul Barrier's shell) |
| `warriorGlint` | skills (item_fx draws it) | UseSkillWarrior's blade glint at the cast; `'mounted'` for Impale |

## Windows and HUD

```
versions/shared/ui/windows/<window>/
  index.tsx    draws the window (only drawing)
  window.ts    export default defineWindow({ id, slot, order, component })
  layout.ts    geometry   style.less   readme.md (when the window has rules worth writing down)
versions/shared/ui/hud/<element>/      same shape, for always-on elements
versions/shared/ui/pages/<page>/       login, server select, character select, preloader, world
  i18n/en.ts   the window's text; one <code>.ts per language next to it
```

Shared widgets (item tooltip, item grid, picked item, frames, buttons, text, cursor, message box)
are the interface controller's: `src/controllers/interface/components/`. A window uses them;
restyling the tooltip once restyles it everywhere.

## Text

Text lives with its owner, one file per language: `<owner>/i18n/en.ts` (required) and
`<owner>/i18n/<code>.ts`. Owners: a window, HUD element or page (`versions/shared/ui/.../<name>/`),
a module (`src/modules/<module>/`, its packet and system messages), a controller or interface
widget (`src/controllers/...`). Keys several owners use sit in the lowest layer that uses them,
else `versions/shared/ui/i18n/`, `src/modules/_shared/i18n/` or `src/i18n/text/` (`common.*`).
`src/i18n` is only the engine: languages, `t()`, the registry, the glob that finds the files. A
new window or module adds its text without touching it. Translators use one sheet per language
(`bun tools/i18n.ts export|import <code>`). See [src/i18n/readme.md](../src/i18n/readme.md) and
[how_to/add_text.md](how_to/add_text.md).

## Maps, monsters, npcs, items

- `maps/<map>/`: the map's spec, its object classes (one file per object type) and `create.ts`.
- `monsters/<name>/index.ts`: one folder per monster or npc type (`defineMonster`: number, name,
  max health, the original table row, and what the controllers do for this type alone: `light`,
  `bodyFx`, `quietCasts`, `teleport`, `stormSkill`), found by glob; plus model classes for the ones
  with their own look. A long row sits next to it (`<name>/bodyFx.ts`). A body file
  (`monster_models/<body>.ts`) carries what follows the body: voices, clip speeds, `quietCasts`,
  `shatter`.
- `items/<group>/<item>.ts`: one file per item (`defineItem`), found by glob; plus item-driven looks
  (`launcher_arrows.ts`).
- An area's master controller (`src/controllers/items`, `src/controllers/monsters`) owns the record
  type, the `define*` function and the registry; the files are the components that use it.

## Improvements

- `improvements/<id>.ts`: one file per deliberate change from the original client
  (`defineImprovement`: id, the lowest preset that turns it on, label and hint keys), found by
  glob. The Fidelity option (Classic / Enhanced / Ultra, then one check each) decides which run;
  the deviating code reads `isOn('<id>')` and keeps the original path when off. Classic is the
  original 1:1, so a fix toward the original is never an improvement.
- The master controller is `src/controllers/fidelity`. Recipe:
  [how_to/add_improvement.md](how_to/add_improvement.md).

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
  actors controller's.

## A map's own rows

A map folder (`versions/shared/maps/<map>/`) also carries what the other controllers used to keep
per world: `sound.ts` (beds, music, object loops, monster voices, footsteps: `MapSound`),
`lighting.ts` (look, room looks, torch table: `MapLighting`), the mesh animations in `spec.ts`
(`render`: `MapRender`), and on the entry itself `weather` (`MapWeather`), `terrain`
(`MapTerrain`) and `fx` (the boids: `MapFx`). Each controller owns its row type and reads the active map's row through
the `maps` controller at run time (`maps.rowFor`), so reworking sound or lighting is an edit to that
controller only, and changing what one map sounds or looks like is an edit to that map only.
Shared building blocks are in `maps/shared/` (`sound.ts`, `looks.ts`, `lights.ts`, `terrain.ts`,
`meshAnimation.ts`).
