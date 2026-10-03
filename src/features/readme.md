# features

Gameplay, one folder per feature. A feature owns its packets, its state and its actions; windows in
`versions/shared/ui/` read the state and call the actions.

## What a feature is
- `net.ts`: the packet handlers (`EventBus.on('<Packet>', ...)`). Importing it registers the
  handlers; only `scope` (`spawnPlayer`) and `skills` (`playTeleportAnimation`) export from it. `src/app/logic.ts` imports every `net.ts`, and that import order is the
  listener order for a packet several features handle. Keep it.
- state: a mobx store (`Social`, `Economy`, `Messenger`, `GmPanel`, ...) or plain module state.
- actions: functions that check the rules and send packets (`Store.sendToGS`).
- the classic rules it ports, with the original source cited next to the code.

Much state still lives in the central Store (`src/app/store.ts`): the hero (`playerData`), sockets,
login, the merchant, item moves, hot keys, skills, buffs, pets and MU Helper flags. It is being split
into features; each feature readme names the Store members it still uses.

Some handlers register outside `logic.ts` order: the `quests` and `events` entry files register
when their facade is first imported (`session/net.ts`, `npc_shop/net.ts`), `skills/masterLevel.ts`
and `masterTree.ts` through the `skills` facade, and `band` through `installBandNet()`.

## The features
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
- [items](items/readme.md): item rules: wire format, stats, requirements, values, compare.
- [marketplace](marketplace/readme.md): player marketplace window state and its service link.
- [mu_helper](mu_helper/readme.md): MU Helper config codec, settings and the auto-hunt loop.
- [npc_shop](npc_shop/readme.md): NPC talk and merchant packets; state in the Store.
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

## Depends on / used by
- uses: `src/controllers`, `src/core`, `src/ecs`, `src/app/store.ts`, packet codecs in
  `versions/shared/packets/`.
- used by: `src/app/logic.ts` (nets), windows and HUD in `versions/shared/ui/`, ECS systems.
- a feature never imports a window (`features-do-not-draw` in `tools/checks/rules.ts`).

## Change it
- handle a new packet: [../../docs/how_to/add_packet_handler.md](../../docs/how_to/add_packet_handler.md).
- add a feature: `src/features/<name>/net.ts` plus one import line in `src/app/logic.ts`, and a
  `readme.md` (`bun tools/checks/index.ts` checks it exists).
- move state out of the Store: put it in the feature, point the windows at the feature.

## Tests
- each feature lists its own `*.test.ts`.
