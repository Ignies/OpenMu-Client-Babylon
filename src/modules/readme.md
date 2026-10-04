# modules

Gameplay, one folder per module. A module owns its packets, its state and its actions; windows in
`versions/shared/ui/` read the state and call the actions.

## What a module is
- `module.ts`: `defineModule({ id, core?, requires?, install })`. `id` is the folder name; `core`
  modules are always on; `requires` turns a module off when one it needs is off (`guild_war` needs
  `guild`). `install` runs once at boot. When the module's handlers live in several files, it
  calls each file's `install<Name>()` in the order their listeners should run (`events`,
  `quests`, `skills`).
- `net.ts`: the packet handlers, registered by `installNet()` (its `install`). Importing the file
  registers nothing.
- `modules.ts` lists every module in install order, and `src/app/logic.ts` calls
  `installModules(MODULES)`. That order is the listener order for a packet several modules
  handle (pinned by `src/app/listenerOrder.golden.test.ts`). Keep it. The constraints today, each
  also noted next to its entry (these listeners registered at import before, ahead of every module):
  - `events` before `warp`: Crywolf's `warpCompleted` and the duel's `wsClosed` reset run first.
  - `warp` before `session`: the scope hold's `wsClosed` runs before the session's.
  - `quests` before `hero` and `combat`: its `CharacterInformation` and `ObjectGotKilled`
    listeners run first.
  - `skills` before `hero`: the master level reads `ExperienceGained` and
    `MasterCharacterLevelUpdate` (and their `Extended` forms) first.
- state: a mobx store in `state.ts` (`Hero`, `Session`, `Bag`, `Merchant`, ...; older ones keep their
  own file: `Social`, `Economy`, `Messenger`, `GmPanel`) or plain module state.
- `index.ts`: the module's door, a small list of what windows and other modules may use (its state
  object and a few actions). Files inside the module import their neighbours directly.
- actions: methods on the state or functions that check the rules and send packets
  (`Session.sendToGS`).
- the classic rules it ports, with the original source cited next to the code.
- `i18n/<code>.ts`: its packet and system messages (`en.ts` required, one file per language),
  found by `src/i18n`'s glob and read with `t()`. Keys several modules share sit in
  `_shared/i18n/`. A streamed module calls `registerText` instead and needs only English. See
  [../i18n/readme.md](../i18n/readme.md).

There is no central store any more. What used to be `Store` lives here: `Hero` (hero), `Session`
(session: sockets, sending, login fields, offline), `Servers` (servers), `CharSelect`
(character_select), `HeroSkills` (skills), `Pets` (pets), `MuHelper` (mu_helper), `GuildMarks`
(guild), `Drops` (drops), `Bag` (inventory), `Merchant` (npc_shop), the warp requests (warp) and
`addNotification` (chat). The page is the interface controller's (`uiState.ts`), the world `Ecs.world`
(`src/ecs/current.ts`), the loading flags, the message box and the weather status their
controllers'. When two modules would import each other, one hands the other a port instead
(`Bag.grids` from economy, `Bag.beforeConsume` from npc_shop, chat's notification sink from social).

No module registers a listener when it is loaded, only when it is installed, so a module that is
off hears nothing (`switchOff.test.ts` checks every module). What still registers at load, ahead
of every module: content that owns its packets (`versions/shared/maps/kanturu2/gateway.ts`'s
`KanturuEnterResult`, before `events/kanturu.ts`; Nova's charge in
`versions/shared/skills/dark_wizard/nova/charge.ts`) and `controllers/terrain/terrainAttributeUpdates.ts`.
Controllers, ECS systems and `app/boot.tsx` add theirs at runtime, after the modules.

## The modules
- [band](band/readme.md): instruments and band play from MIDI files, relayed by the proxy.
- [chaos_mix](chaos_mix/readme.md): chaos machine packets; state in `Economy`.
- [character_select](character_select/readme.md): create / delete answers, line-up layout, backdrop.
- [chat](chat/readme.md): chat packets, log model, notices, `/` commands, item links, emojis.
- [combat](combat/readme.md): attack and skill animations, hits and kills of other objects.
- [drops](drops/readme.md): items and zen on the ground, name tiers, loot filter.
- [economy](economy/readme.md): the `Economy` store for vault, chaos machine, trade, personal shop.
- [events](events/readme.md): Blood Castle, Devil Square, Chaos Castle, Duel and the other events.
- [friends](friends/readme.md): friend list, letters (`Messenger`), chat room invites.
- [gm](gm/readme.md): game master panel, command catalogue, admin feed, offline debug menu.
- [guild](guild/readme.md): guild packets; state in `Social`.
- [guild_war](guild_war/readme.md): guild war, Battle Soccer, alliances; state in `Social`.
- [hero](hero/readme.md): the hero's stats, vitals, level, experience, respawn, stat points.
- [inventory](inventory/readme.md): the bag, the shared item grid model and item runs.
- [marketplace](marketplace/readme.md): player marketplace window state and its service link.
- [mu_helper](mu_helper/readme.md): MU Helper config codec, settings and the auto-hunt loop.
- [npc_shop](npc_shop/readme.md): NPC talk and merchant packets, the merchant window (`Merchant`).
- [options](options/readme.md): player settings (`GameOptions`), mobile skill slots, saved hot keys.
- [party](party/readme.md): party packets; state in `Social`.
- [personal_shop](personal_shop/readme.md): player stall packets; state in `Economy`.
- [pets](pets/readme.md): pets and mounts: models, drawing, Dark Raven / Dark Horse.
- [quests](quests/readme.md): legacy quests, quest log, NPC dialogue, kill counters.
- [scope](scope/readme.md): objects entering and leaving view, moves, appearance changes.
- [servers](servers/readme.md): server profiles, server list, saved accounts, probes, service URLs.
- [session](session/readme.md): connect, login, logout, resume after a drop, session stats.
- [skills](skills/readme.md): buff timers, re-use delays, castability, master level and tree.
- [social](social/readme.md): the `Social` store (chat, party, guild) and the guild mark codec.
- [trade](trade/readme.md): trade packets; state in `Economy`.
- [vault](vault/readme.md): vault packets; state in `Economy`.
- [warp](warp/readme.md): map changes, teleports, the loading hold after a warp.
- [world](world/readme.md): weather, fanfare and map-wide object effects.
- `_shared/net_helpers.ts`: helpers more than one `net.ts` uses (player names, monster attacks).
  `_shared/i18n/`: text more than one module uses.

## Depends on / used by
- uses: `src/controllers` (their public files), `src/core`, `src/ecs`, `controllers/interface/uiState.ts`
  (the page), each other's doors, packet codecs in `versions/shared/packets/`.
- used by: `src/app/logic.ts` (`installModules(MODULES)`), windows and HUD in
  `versions/shared/ui/`, ECS systems.
- a module never imports a window (`modules-do-not-draw` in `tools/checks/rules.ts`).

## Change it
- handle a new packet: [../../docs/how_to/add_packet_handler.md](../../docs/how_to/add_packet_handler.md).
- add a module: `src/modules/<name>/` with `net.ts` (`installNet`), `module.ts`, a `readme.md`
  (`bun tools/checks/index.ts` checks it exists), and one line in `modules.ts` where its
  listeners should run.
- turn a module off: pass `enabled` to `installModules` (servers will choose this; not wired yet).
- add state: a field on the module's state (`state.ts`), exported through `index.ts`; windows read
  it there. A controller that needs it gets a reader through a hook the app or the module sets.

## Known gaps
- `social` (core), `economy` and `gm` have a `module.ts` with nothing to install: their state is
  loaded by whoever imports it. Turning `economy` off turns off `vault`, `chaos_mix`, `trade` and
  `personal_shop` (they require it).
- Windows do not yet hide when their module is off, and the `events` and `quests` facades keep
  their frame update and client-side entry points (their readmes, "When it is off").

## Tests
- `module.test.ts`: install order, disabled and core modules, requirements.
- `modules.test.ts`: every `module.ts` is listed once and named after its folder.
- `switchOff.test.ts`: every module registers its listeners when installed, not when loaded;
  with events or quests off, their packets keep only the other modules' listeners.
- each module lists its own `*.test.ts`.
