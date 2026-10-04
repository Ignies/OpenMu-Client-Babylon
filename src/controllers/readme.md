# controllers

Generic services the game is built from. A controller knows how to do something (play a sound,
spawn an effect, time a swing), never which skill, item or window does it. The full rules are in
[../../docs/controllers.md](../../docs/controllers.md).

## Public API
- `Controller`, `ControllerContext` (`controller.ts`): the contract a facade satisfies: an `id`,
  and optionally `init(ctx)` once at boot, `update(map, dt)` every frame, `reset()` on map change.
- `CONTROLLERS`, `initControllers(ctx)` (`controllers.ts`): the controllers the game starts, in
  init order: `weather, lighting, effects, combat, sound, maps`. Called once by `app/boot.tsx`.

## The controllers
| Folder | What | Entry point |
|---|---|---|
| [actors](actors/readme.md) | player, monster and npc model objects, wings, weapons on the body | modules |
| [anim](anim/readme.md) | clip choice and play speed | modules |
| [assets](assets/readme.md) | data folder, downloads, BMD, texture packs | modules |
| [camera](camera/readme.md) | camera layers (mouse look, Battle Castle, PK field) | `index.ts` functions |
| [combat](combat/readme.md) | attack timing, ranges, cast targets, skill hook slots | `combat` |
| [fidelity](fidelity/readme.md) | Classic / Enhanced / Ultra, the improvement registry, `isOn(id)` | `index.ts` functions |
| [fx](fx/readme.md) | `effects.spawn` and every effect layer | `effects` |
| [interface](interface/readme.md) | window registry, shared widgets, hotkeys, cursor | `windows.ts` |
| [item_fx](item_fx/readme.md) | item materials, glow tiers, weapon trails | modules |
| [lighting](lighting/readme.md) | light sources, sky, the skill light engine | `lighting` |
| [loading](loading/readme.md) | loading gates; `classic/` is the original screen | modules |
| [maps](maps/readme.md) | map registry contract (maps are content) | `maps` |
| [net](net/readme.md) | sockets, encryption, packet facade, side protocols | modules |
| [render](render/readme.md) | model objects, prop batches, shadows, post passes | modules |
| [skills](skills/readme.md) | `defineSkill`, `registerSkills`, the skill visual engine | `index.ts` |
| [sound](sound/readme.md) | buses, music, combat sounds, sound manager | `sound` |
| [terrain](terrain/readme.md) | terrain loading, grass, water, masks | modules |
| [weather](weather/readme.md) | rain, snow, ambient weather | `weather` |

## How it works
- The six facades in `CONTROLLERS` are classes that `implements Controller`. Each keeps a list of
  layers (its `layers.ts`; maps is handed `versions/shared/maps/layers.ts` at boot) and steps
  or resets them.
- `init` runs once from `initControllers` at boot, before the ECS world exists. Today only
  `sound` has one.
- `update` is not called from here: each controller's own ECS system steps it
  (`EffectSystem` -> `effects.update`, `AttackSystem` -> `combat.update`, ...).
- `reset` is not called from here either: `app/lifecycle.ts` resets weather, lighting, effects,
  combat, sound and maps (plus three modules) on every map change, in its own order.
- Content plugs in through registries, never through imports from the controller:
  `registerSkills` (`skills/index.ts`), `registerWindows` (`interface/windows.ts`), the hook slots
  in `combat/skillHooks.ts`.

## Depends on / used by
- uses: `src/core`, data tables, each other.
- used by: `app/`, `ecs/systems`, modules, content in `versions/`.
- A controller never imports a module, `app/` or content. `bun run check` enforces it; old
  exceptions are in `tools/checks/baselines/deps.json` and may only shrink.

## Change it
- add a controller: make `src/controllers/<name>/` with an `index.ts` facade that implements
  `Controller`, a `readme.md`, and (if it has entries) `layer.ts`, `layers.ts`, `_template.ts`.
  Add it to `CONTROLLERS` if it needs `init`, to `app/lifecycle.ts` if it resets on map change,
  and step its `update` from an ECS system.
- add a look without losing the classic one: add a new implementation beside it, chosen by an
  option or a version ([../../docs/controllers.md](../../docs/controllers.md)).

## Tests
- None for `controller.ts` / `controllers.ts`; each controller folder lists its own.
