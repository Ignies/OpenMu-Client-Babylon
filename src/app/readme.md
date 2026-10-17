# app

Boot, the root React component, the offline test scene, the module install and the map-change
reset. This is the top of the graph: it wires modules, controllers and versions together, and
nothing imports it (`only-the-app-imports-the-app` in `tools/checks/rules.ts`). Gameplay state
lives in the modules (see [../modules/readme.md](../modules/readme.md)); the page the app shows is
the interface controller's (`AppState`, `controllers/interface/uiState.ts`).

## What is here
- `main.tsx`, `boot.tsx`: start the version, the engine, the controllers and the ECS world.
- `App.tsx`: the root component; picks the page from `AppState.uiState`.
- `logic.ts`: installs the modules, sends `Ping`, refreshes NPC names, hands the map ping its link.
- `lifecycle.ts`: `resetForMapChange()`, what resets on a map change.
- `backgroundTick.ts` (+ `backgroundTick.worker.ts`): the logic step while the browser gives no frames.
- `buildCheck.ts` ("Builds", ours): a tab left open across a deploy compares its `BUILD_ID` with the
  `build.json` every build ships (`vite.config.ts`), at start, every 5 min and on coming back to the
  tab; on another build it clears the cache and reloads (`controllers/assets/cacheReset.ts`) at once
  while there is no game session (the server list, where a disconnect lands too), else once the
  session ends; never from the login, the characters or the world. A session flag stops a reload loop.
- `warpScreen.ts`: `warpShowsScreen(...)`, whether a warp covers the scene with the loading screen: not for
  a warp within the map up in the world (`ReceiveTeleport` loads no world for it, WSclient.cpp:2201-2204).
- `offline.ts`: `playOffline()`, the offline test scene (`/offline`, the preloader's Play Offline):
  no server, a test hero on `?map=`, with `?class=`, `?skin=`, `?hand1=` / `?hand2=` / `?pet=`,
  `?bare`, `?hp=` / `?mp=` as screenshot seams. `App.tsx` hands it to the preloader page.
- `townPrefetch.ts` (ours, no visible change): boot installs it on `warpCompleted`; the first time the
  hero is in the world, 3 s later, the terrain files of the towns and first hunting grounds the version
  ships (`WARM_MAPS`) download in the background, so a `/move` there finds them in memory
  (`controllers/assets/prefetchWorld.ts` keeps them until that map loads).
- `bench.ts` (ours, dev build only, `?offline&bench`): `playOffline` loads it when asked. The hero walks a
  fixed loop, `players=N` and `monsters=M` are spawned around him (seeded), then `seconds=S` (30) of
  frames are timed and printed (a panel, the console `[bench]` line, `window.__bench`). `&preset=0..3`
  and `&set=glow:0,shadows:false` set options first, for an A/B. Reads the URL through `core/devSeams.ts`.
- The live ECS world is `Ecs.world` (`src/ecs/current.ts`), which any layer may read. The default
  server endpoints are `modules/servers/defaults.ts`; the install-as-app button is
  `modules/options/pwaInstall.ts`.

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
  most every 5 s) and draws only one frame in 6 while a covering page hides a loaded scene.
  With no frames from the browser (a hidden tab, a minimised window) a worker ticks at the original's
  25 Hz and each tick runs the same frame without the draw: the systems and the clips
  (`scene.animate`), so the hero walks on and the MU Helper keeps hunting, as a windowed original
  minimised does (`Winmain.cpp:1495` runs its scene loop unfocused). The game's page timers are
  single waits, which a hidden tab delays by a second at most, so none moved to the tick. It also
  blocks the browser context menu and wheel outside scrollables, and handles `requestWarp`.
- `boot.tsx` is also where layers meet that may not import each other: the session resume
  (`Session.resumeHook`), the hero's gear after a warp (`onHeroPlaced`), the repair cursor
  (`setRepairCursor`), the bag icons drawn from the model (`setLiveItemIcons`), the login music's page
  readers and the loading screen's `hidden` reader.
  Debug handles: `window.__modules` (`Hero`, `Session`, `Bag`, `Merchant`), `__world`, `__social`, ...
- `App.tsx` picks the page from `AppState.uiState`. Login and character pages come from the version
  (`loadVersionUi().pregame`), lazy loaded.
- `logic.ts` installs the modules (`installModules(MODULES, undefined, moduleHost.api)`,
  `src/modules/modules.ts`); that list's order is the listener order per packet. Each install gets
  its module's API (`src/modules/_api/ports.ts`); the wiring is here because `module.ts` importing
  the host would close an import cycle (`src/modules/_api/readme.md`). It also refreshes NPC names when their table loads, sends
  `Ping` every 5 s in the world and hands the map ping its `PingLink`. The shared F3/0x40 server
  command is the world module's (`modules/world/net.ts`).
- `lifecycle.ts` lists what resets on a map change, in order:
  `weather, lighting, effects, buffLooks, events, skills, combat, quests, sound, maps` (the order of the
  original inline sequence in `loadMapIntoScene`), then `releaseUnused`. Why each one resets:
  - weather, events, skills, combat, maps: drop per-map layer state.
  - lighting: disposes every light source; the terrain light field is rebuilt from the new bake.
  - effects: ends live effects, cancels pending timed steps, drops pools.
  - buffLooks (right after effects): draws again the buff looks of the bodies the new map keeps (the
    hero, and whoever entered view while it loaded), which still hold their effects.
  - quests: closes the NPC windows and drops per-map state.
  - sound: stops the old map's sounds and evicts decoded effects not used lately.
  - last, `releaseUnused`: frees the old map's sign plates and the monster and NPC models nothing
    draws any more (`DeleteMonsters` / `DeleteNpcs`), once the effects above dropped their clones.

### Notes: the old Store
`store.ts` held the hero, the sockets, the login, the bag, the merchant, the skills, pets and more
in one object that most files imported, which tied every module (and many controllers) to the
whole app graph. Each piece moved to the module that owns it (`Hero`, `Session`, `Servers`,
`CharSelect`, `HeroSkills`, `Pets`, `MuHelper`, `GuildMarks`, `Drops`, `Bag`, `Merchant`, the warp
requests, chat's `addNotification`) or down to a controller (`Loading`, `MsgBox`, `WeatherStatus`)
or `src/ecs` (`Ecs.world`). The codemod that rewrote `Store.x` is in git history
(`tools/restructure/storeSplit.ts`).

## Depends on / used by
- uses: every module (`net.ts`, state), most controllers, `src/ecs`, `src/version`, `versions/`.
- used by: nothing but tests, which import `logic.ts` to load the app the way the browser does.

## Change it
- handle a new packet: add it to `installNet` in `src/modules/<module>/net.ts`; add a new module's
  `module.ts` to `src/modules/modules.ts` (order matters per packet).
- add gameplay state: in its module (`src/modules/<module>/state.ts`, exported by its `index.ts`),
  never here.
- reset something on map change: give it a `reset()` and add it to `MAP_RESET` in `lifecycle.ts`.
- start a new controller: list it in [../controllers/controllers.ts](../controllers/controllers.ts).
- change default server endpoints: the `VITE_*` env vars read in `modules/servers/defaults.ts`.

## Tests
- `warpScreen.test.ts`: a same-map warp in the world shows no loading screen; any other does.
- `listenerOrder.golden.test.ts`: every packet's listeners and their order once the app has loaded.
  It hashes each listener's code without whitespace or vitest's numbered import aliases, so moving
  an import keeps the hash; changing a listener or the install order changes it.
- `buildCheck.test.ts`: nothing on the same build, reload with no game session, wait during one,
  never twice for one build; only the preloader and the server list have no session.
- `townPrefetch.test.ts`: the warm maps are fetched once, after the first map in the world, never on the
  character screen.
- `bench.test.ts`: the bench crowd is the same every run.
- `backgroundTick.test.ts`: the tick runs a logic step only once the browser stopped giving frames.
- `lifecycle.test.ts`: the map-change resets run in order (the buff looks redrawn right after the
  effects end), then the sign plates and the unused monster and NPC models are freed.
- `observableStores.test.ts`: no observable store member is named after an `Object.prototype`
  member (mobx would throw while building the store).
