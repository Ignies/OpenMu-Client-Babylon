# gm

The game master panel (its state, the command catalogue, the map list, the admin feed) and the
offline debug menu registry. There is no `net.ts`: the panel sends ordinary chat lines and the
server decides whether to run them.

## Public API
- `GmPanel` (`gmPanel.ts`): the panel store. `available` (game master or offline), `toggle()`,
  `run(command)`, `sendRaw(line)`, `runLine(line, vars)`, `runMacro(macro, vars)`, `reset()`, plus
  the tab, target, search and form setters the window calls. `GM_SECTIONS`, `GmSection`: the tabs.
- `gmCommand(name)`, `GM_COMMANDS`, `GmCommand`, `GmParam` (`gmCommands.ts`): the command catalogue.
- `GM_MAPS`, `mapName(number)` (`gmMaps.ts`): OpenMU map numbers and names.
- `worldView()`, `WorldView`, `Nearby` (`gmWorld.ts`): the hero and the entities in scope.
- `AdminFeed` (`admin/feed.ts`): the proxy admin stream. `start()`, `stop()`, `requestLog(name)`.
- `GmLibrary`, `spread(count)`, `MAX_DELAY_MS` (`admin/gmLibrary.ts`): macros, favourites, presets.
- `searchSkins`, `searchItems`, `itemCommandValues`, `DEFAULT_ITEM_SPEC`, `ITEM_GROUPS`
  (`admin/catalogues.ts`); `skinCatalogue()`, `spawnCatalogue()`, `skinDisplayName`,
  `itemDisplayName` (`admin/skins.ts`).
- `registerDebugModule(module)`, `DebugMenu` (`debugMenu.ts`): the debug menu registry.

## How it works
- Every button builds a `/line` from the catalogue (`buildCommandLine`) and `GmPanel` sends it with
  `Social.sendChat`. Sends are queued and retried every 600 ms because `sendChat` refuses a line
  inside `CHAT_COOLDOWN_MS`. A `confirm: true` command arms on the first press and sends on the
  second; editing a field disarms it. The last 12 sent lines are kept.
- `available` reads `Hero.isGameMaster` (set by `hero/net.ts`) or `Session.isOffline`.
- `gmWorld.ts` reads the ECS on every call (not observable); the window polls it while open.
  `gmNearby.ts` holds the sorting and distance math (players first, then Chebyshev distance).
- `admin/`: `feed.ts` opens a WebSocket to the proxy (`adminStreamUrl`) only while the panel is
  open and mirrors its players, moves and journal lines; a refusal stops reconnects.
  `gmLibrary.ts` keeps macros, favourites and item presets in localStorage (`mu_gm_*` keys) and
  drops a list that does not validate. `catalogues.ts` builds the skin, spawn and item lists from
  the monster and item files; `skins.ts` plugs in the model tables.
- `debugMenu.ts` is a registry only; the window draws the modules and opens only offline.

## Depends on / used by
- uses: `social/social.ts` (`sendChat`), `hero`, `session` (`isOffline`), `Ecs.world`,
  `controllers/net/protocols/adminProtocol.ts`, `controllers/actors` model tables, `src/i18n`.
- used by: `versions/shared/ui/windows/gm_panel/` (all of it), `versions/shared/ui/windows/debug_menu/`
  (registry and modules), `hero/net.ts` (`GmPanel.reset()` on character select), `src/app/boot.tsx`.

## Change it
- add or fix a command: add an entry to `GM_GROUPS` in `gmCommands.ts`, with the parameter order the
  server's argument class declares; add its text keys to `src/i18n`.
- add a map: `GM_MAPS` in `gmMaps.ts`, using OpenMU's number, not the client's.
- add a tab: `GmSection` and `GM_SECTIONS` in `gmPanel.ts`, then a file in `gm_panel/tabs/`.
- add a debug menu tab: a module in `debug_menu/modules/` that calls `registerDebugModule`.

## Tests
- `gmCommands.test.ts`: catalogue shape, `buildCommandLine` order and errors, `matchGmCommands`.
- `gmNearby.test.ts`: distance, kind, sort order and filtering in `nearbyOf`.
- `admin/catalogues.test.ts`: skin, spawn and item lists, search, `/item` values.
- `admin/gmLibrary.test.ts`: `expandLine`, `spread`, `readList`, `sameFavourite`.

## Notes
### gmCommands.ts
- Each entry is a command OpenMU implements in `GameLogic/PlugIns/ChatCommands`. The panel can only
  send what a player could type in the chat box.
- The server parses positionally when there is no `name=value` pair
  (`CommandExtensions.TryParseArgumentsAsync`), so a blank optional parameter ends the line. The
  `set*` commands take the value first and the character second.
- All need `CharacterStatus.GameMaster` except `/openware`, `/npc` and `/clearinv`, which do more
  for a game master (warehouse anywhere, any NPC store, someone else's inventory).
- Labels are `TextKey`s resolved when drawn (the table is module scope); slash names are not translated.
- The shape mirrors OpenMU's `AvailableChatCommand`, so the server's own list can replace it once
  the client declares itself as OpenMU 106.3.
