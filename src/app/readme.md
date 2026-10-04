# app

Boot, the root React component, the page the app shows, the offline test scene, the list of
packet handlers and the map-change reset. This is the top of the graph: it wires modules,
controllers and versions together. Gameplay state lives in the modules (see
[../modules/readme.md](../modules/readme.md)), not here.

## Public API
- `AppState`, `UIState` (`uiState.ts`): the page the app shows (`uiState`) and the hide-interface
  key (`hudHidden`). Session and hero packets move the page; it imports only mobx.
- `playOffline()` (`offline.ts`): the offline test scene (`/offline`, the preloader's Play Offline):
  no server, a test hero on `?map=`, with `?class=`, `?skin=`, `?hand1=` / `?hand2=` / `?pet=`,
  `?bare`, `?hp=` / `?mp=` as screenshot seams. `App.tsx` hands it to the preloader page.
- The live ECS world is `Ecs.world` (`src/ecs/current.ts`), which any layer may read.
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
  `resetForMapChange` with `onMapChange`, builds the ECS world (`createWorld`, set as `Ecs.world`)
  and runs the render loop. The loop clamps `dt` to 0.1 s, catches a frame that throws (logged at
  most every 5 s) and draws only one frame in 6 while a covering page hides a loaded scene. It also
  blocks the browser context menu and wheel outside scrollables, and handles `requestWarp`.
- `boot.tsx` is also where layers meet that may not import each other: the session resume
  (`Session.resumeHook`), the hero's gear after a warp (`onHeroPlaced`), the repair cursor
  (`setRepairCursor`), the login music's page readers and the loading screen's `hidden` reader.
  Debug handles: `window.__modules` (`Hero`, `Session`, `Bag`, `Merchant`), `__world`, `__social`, ...
- `App.tsx` picks the page from `AppState.uiState`. Login and character pages come from the version
  (`loadVersionUi().pregame`), lazy loaded.
- `logic.ts` installs the modules (`installModules(MODULES)`, `src/modules/modules.ts`); that list's
  order is the listener order per packet. It also refreshes NPC names when their table loads, sends
  `Ping` every 5 s in the world and hands the map ping its `PingLink`. The shared F3/0x40 server
  command is the world module's (`modules/world/net.ts`).
- `lifecycle.ts` lists what resets on a map change, in order:
  `weather, lighting, effects, events, skills, combat, quests, sound, maps` (the order of the
  original inline sequence in `loadMapIntoScene`). Why each one resets:
  - weather, events, skills, combat, maps: drop per-map layer state.
  - lighting: disposes every light source; the terrain light field is rebuilt from the new bake.
  - effects: ends live effects, cancels pending timed steps, drops pools.
  - quests: closes the NPC windows and drops per-map state.
  - sound: stops the old map's sounds and evicts decoded effects not used lately.

### Notes: the old Store
`store.ts` held the hero, the sockets, the login, the bag, the merchant, the skills, pets and more
in one object that most files imported, which tied every module (and many controllers) to the
whole app graph. Each piece moved to the module that owns it (`Hero`, `Session`, `Servers`,
`CharSelect`, `HeroSkills`, `Pets`, `MuHelper`, `GuildMarks`, `Drops`, `Bag`, `Merchant`, the warp
requests, chat's `addNotification`) or down to a controller (`Loading`, `MsgBox`, `WeatherStatus`)
or `src/ecs` (`Ecs.world`); `tools/restructure/storeSplit.ts` did the `Store.x` rewrites.

### Notes: pwaInstall.ts
The browser fires `beforeinstallprompt` once, early. `main.tsx` calls `watchInstallState()` so the
event is held from the start, and the options window spends it whenever the player presses the
button. Installing does not change rendering; it gives a taskbar icon and persistent storage for
downloaded assets. The module imports nothing from the app so `main.tsx` can load it before the
version resolves.

## Depends on / used by
- uses: every module (`net.ts`, state), most controllers, `src/ecs`, `src/version`, `versions/`.
- used by: modules that move the page (`uiState.ts`: session, hero, servers), pages and HUD that
  read it, and ECS systems (`spawnPlayer` from `logic.ts`). Controllers and content may not import
  it (`tools/checks/rules.ts`).

## Change it
- handle a new packet: add it to `installNet` in `src/modules/<module>/net.ts`; add a new module's
  `module.ts` to `src/modules/modules.ts` (order matters per packet).
- add gameplay state: in its module (`src/modules/<module>/state.ts`, exported by its `index.ts`),
  never here.
- reset something on map change: give it a `reset()` and add it to `MAP_RESET` in `lifecycle.ts`.
- start a new controller: list it in [../controllers/controllers.ts](../controllers/controllers.ts).
- change default server endpoints: the `VITE_*` env vars read in `consts.ts`.

## Tests
- `listenerOrder.golden.test.ts`: every packet's listeners and their order once the app has loaded.
- `observableStores.test.ts`: no observable store member is named after an `Object.prototype`
  member (mobx would throw while building the store).
- `pwaInstall.test.ts`: install flow (no prompt yet, accepted, refused, already installed, second
  press while the dialog is up).
