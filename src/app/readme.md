# app

Boot, the root React component, the `Store`, the list of packet handlers and the map-change
reset. This is the top of the graph: it wires modules, controllers and versions together.

## Public API
- `Store`, `UIState` (`store.ts`): the global mobx store (sockets, hero data, inventory, windows).
  Imported by most modules, ECS systems and windows; being split into the modules. The live
  ECS world is `Ecs.world` (`src/ecs/current.ts`), which any layer may read.
- `consts.ts`: default connect-server / ws-proxy endpoints (`VITE_CS_HOST`, `VITE_WS_HOST`, ...)
  and the ECS debug flags. The login field limits are `modules/servers/serverAccounts.ts`; the
  terrain and music dev switches live in `terrain/consts.ts` and `sound/soundsManager.ts`.
- `spawnPlayer`, `summonDisplayName`, `emitObjectEffect` (`logic.ts`).
- `PwaInstall`, `installApp()` (`pwaInstall.ts`): install the client as an app (options window).

## How it works
- `main.tsx` loads the game version from the active server profile (`versionIdForTag`), then
  imports `boot.tsx`. Everything behind `boot.tsx` reads `gameVersion` at module scope, so it must
  load after the version is set.
- `boot.tsx` first hands the shared maps to the maps controller (`versions/shared/maps/all.ts`;
  client-only, so not in the version modules the servers load), then creates the Babylon engine and
  scene, calls `initControllers({ scene })`
  ([../controllers/controllers.ts](../controllers/controllers.ts)), registers
  `resetForMapChange` with `onMapChange`, builds the ECS world (`createWorld`) and runs the render
  loop. The loop clamps `dt` to 0.1 s, catches a frame that throws (logged at most every 5 s) and
  draws only one frame in 6 while a covering page hides a loaded scene. It also blocks the browser
  context menu and wheel outside scrollables, and handles `requestWarp`.
- `App.tsx` picks the page from `Store.uiState`. Login and character pages come from the version
  (`loadVersionUi().pregame`), lazy loaded.
- `logic.ts` installs the modules (`installModules(MODULES)`, `src/modules/modules.ts`); that list's order is the listener order per
  packet. It also refreshes NPC names when their table loads and sends `Ping` every 5 s in the
  world. The shared F3/0x40 server command is the world module's (`modules/world/net.ts`).
- `lifecycle.ts` lists what resets on a map change, in order:
  `weather, lighting, effects, events, skills, combat, quests, sound, maps` (the order of the
  original inline sequence in `loadMapIntoScene`). Why each one resets:
  - weather, events, skills, combat, maps: drop per-map layer state.
  - lighting: disposes every light source; the terrain light field is rebuilt from the new bake.
  - effects: ends live effects, cancels pending timed steps, drops pools.
  - quests: closes the NPC windows and drops per-map state.
  - sound: stops the old map's sounds and evicts decoded effects not used lately.

### Notes: pwaInstall.ts
The browser fires `beforeinstallprompt` once, early. `main.tsx` calls `watchInstallState()` so the
event is held from the start, and the options window spends it whenever the player presses the
button. Installing does not change rendering; it gives a taskbar icon and persistent storage for
downloaded assets. The module imports nothing from the app so `main.tsx` can load it before the
version resolves.

## Depends on / used by
- uses: every module (`net.ts`, state), most controllers, `src/ecs`, `src/version`, `versions/`.
- used by: modules, ECS systems, `versions/shared/ui` windows (mostly `Store`). Controllers and
  content may not import it (`tools/checks/rules.ts`); the old `store.ts` / `storeRef.ts` imports
  are listed in `tools/checks/baselines/deps.json` and may only shrink.

## Change it
- handle a new packet: add it to `installNet` in `src/modules/<module>/net.ts`; add a new module's
  `module.ts` to `src/modules/modules.ts` (order matters per packet).
- reset something on map change: give it a `reset()` and add it to `MAP_RESET` in `lifecycle.ts`.
- start a new controller: list it in [../controllers/controllers.ts](../controllers/controllers.ts).
- change default server endpoints: the `VITE_*` env vars read in `consts.ts`.

## Tests
- `observableStores.test.ts`: no observable store member is named after an `Object.prototype`
  member (mobx would throw while building the store).
- `pwaInstall.test.ts`: install flow (no prompt yet, accepted, refused, already installed, second
  press while the dialog is up).
