# Controllers

A controller is a generic service: sound, effects, lighting, weather, item effects, loading,
animation, rendering, camera, terrain, assets, network, interface, combat, skills. It knows how to
do something, never which skill, item or window does it.

## Shape

```
src/controllers/<name>/
  index.ts      the facade the game calls (effects.spawn, sound.play, lighting.skillAt...)
  layer.ts      the contract one entry implements (where the controller has entries)
  layers.ts     the built-in entries, in order
  _template.ts  a copy-me entry
  recipes.ts    shared constants (textures, colours, timings)
  readme.md     what it does, its API, how to extend it
```

## Public files

Code outside a controller imports the files at its root (`fx/recipes.ts`, `skills/define.ts`,
`sound/sfx.ts`...) and the `index.ts` of any of its folders (`net/protocols`, `assets/mu`,
`interface/hooks`, each widget in `interface/components/<widget>/`). The rest of a subfolder is
private: when outside code needs a file in there, export it from that folder's `index.ts`.
`bun run check` enforces it.

There is no single door per controller on purpose. The controllers use each other's files, and
routing all of that through one `index.ts` each would turn the import graph into one 228-file
cycle, where load order decides whether a class exists yet. Pointing at the file that has the code
keeps the graph free of cycles, and check 7 keeps it that way.

Every facade satisfies `Controller` (`src/controllers/controller.ts`): an `id`, and optionally
`init(ctx)` once at boot, `update(map, dt)` every frame (from its ECS system) and `reset()` on map
change. `src/controllers/controllers.ts` lists the controllers the game starts, in order;
`src/app/lifecycle.ts` lists what resets when the map changes, in order.

## How content plugs in

Controllers expose registries and slots; content fills them when it loads:

| Controller | Filled by | With |
|---|---|---|
| skills, fx, lighting, sound, combat | `defineSkill({...})` in each skill file | visual, light, sound, clip, delay, target, step-in, buff looks |
| combat | a skill's `combat: { layer, hooks }` | skill-owned state (Nova charge, Combo, Dark Side) via `combat/skillHooks.ts` |
| interface | `defineWindow({...})` in each `window.ts` | windows and HUD elements, in stacking order |
| maps | `versions/shared/maps/all.ts` (`registerMaps(MAP_LAYERS)`, first import of `app/boot.tsx`) | one entry per map |

`registerSkills` (`src/controllers/skills/index.ts`) and `registerWindows`
(`src/controllers/interface/windows.ts`) are the only places that write into those tables.

## Customising a controller without losing the original

The classic behaviour is never edited to add a new look. A new look is a new implementation next
to it, chosen by a game version or an option:

- loading screen: `src/controllers/loading/classic/` is the original; add `loading/<name>/` and
  pick it where the loading screen is mounted.
- a window: a version registers a window with the same `id` from `versions/<id>/ui`; the shared
  one stays for every other version.
- rendering looks already work this way: Options > Rendering Style picks classic or graded
  paths, and every graded look is a separate branch.

## Rules

- A controller imports `src/core`, other controllers and data tables. Never a module, the app,
  or content (`bun run check` enforces it; old exceptions are listed in
  `tools/checks/baselines/deps.json` and may only shrink).
- No import cycles (`bun run check`; the old ones are in `tools/checks/baselines/cycles.json`).
- Per-frame code allocates nothing and walks no scene graph.
- Each controller folder has a `readme.md`.
