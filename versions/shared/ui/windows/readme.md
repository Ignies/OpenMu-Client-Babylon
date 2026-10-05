# windows

One folder per in-game window. A window draws; its state and actions belong to its module
(`src/modules/<module>`, through its door). Recipe: [docs/how_to/change_a_window.md](../../../../docs/how_to/change_a_window.md).

## Public API
- Each `window.ts` default-exports one `defineWindow({ id, slot, order, component, module? })` or an
  array of them. All windows here use `slot: 'hud'`; higher `order` draws on top.
- `module`: the optional module the window belongs to (`'trade'`, `'guild'`...). On a world whose
  `server.json` turns that module off (`modulesOff`) the world page does not draw the window.

## How it works
- `versions/shared/ui/index.ts` globs `./{windows,hud}/*/window.{ts,tsx}` and registers every
  definition, then registers the running version's `ui.windows` (same `id` replaces).
- The world page (`../pages/world`) draws every `hud` window in order, minus the windows of modules
  that are off (`../pages/world/shown.ts`). Each window hides itself when its module's flag says it
  is closed.
- Folder shape: `index.tsx` (drawing), `window.ts`, `layout.ts` (geometry, sprite lists),
  `style.less`, `i18n/<code>.ts` (the window's text: `en.ts` plus one file per language, found by
  `src/i18n`'s glob; see [src/i18n/readme.md](../../../../src/i18n/readme.md)). Shared widgets (item grid, tooltip, frames, buttons) are in
  `src/controllers/interface/components/`.

| Folder | id (order) | Shows | Reads |
|---|---|---|---|
| `inventory` | inventory (80) | the hero's bag and equipment, repair mode | hero, inventory, npc_shop, items, economy, events |
| `npc_shop` | npc_shop (90) | the merchant's stock; buy, sell, repair | Merchant, items, inventory |
| `vault` | vault (100) | the warehouse, zen buttons, pin lock | hero, economy, inventory |
| `chaos_machine` | chaos_machine (110) | the goblin's mix tray and recipe menu | economy, inventory |
| `trade` | trade (120) | partner's half on top, the hero's below | hero, economy, inventory |
| `personal_shop` | my_shop (130), shop_browser (140) | the hero's stall; another player's stall | economy, inventory |
| `character_info` | character_info (150) | stats and stat point buttons | Hero, hero, options |
| `pet_info` | pet_info (160) | Dark Horse / Dark Raven sheet and raven commands | pets (`Pets`), hero |
| `mu_helper` | mu_helper (170) | MU Helper settings, hunt and obtain tabs | mu_helper, skills, hero |
| `marketplace` | marketplace (190) | listings from the marketplace service | marketplace |
| `move_command_window` | move_command (200) | the "M" map list with level and zen | session, warp, hero |
| `emote_menu` | emote_menu (210) | radial emote menu | social, hero, chat, band |
| `instrument_window` | instrument (220) | song, channels and band for the instrument in hand | band |
| `command_window` | command (240) | the "D" player command buttons | chat (commands) |
| `quick_command_window` | quick_command (250) | right-click menu on another player | chat, options |
| `party` | party (260) | members with HP, invite list of nearby players | social, economy, skills |
| `guild` | guild (270), guild_master_dialog (370), guild_creation_dialog (380), guild_kick_password_dialog (390) | guild tabs and its dialogs | social, GuildMarks |
| `skills` | skills (280) | the learned-skill list | HeroSkills, skills |
| `master_skills` | master_skills (290) | the version's master tree (`loadVersionUi().MasterSkillsWindow`), lazy | skills |
| `quests` | quests (300), quest_tracker (460) | quest NPC pages and the on-screen tracker | quests, options |
| `friends` | friends (310) | friend list, letters, chat room list | friends, chat |
| `chat_room` | chat_room (320) | chat server rooms, one tab per room | chat, friends |
| `social_prompts` | social_prompts (330) | yes/no boxes for party, guild, war, alliance, friend | social, friends |
| `economy_prompts` | trade_prompt (340), economy_prompts (350) | trade request; zen, pin and price prompts | economy, items, inventory |
| `events` | events (400) | event entry windows, Chaos Castle prompt, timers, results | events, items |
| `balgass_entry` | balgass_entry (410) | third class quest entry boxes | quests |
| `duel` | duel (430) | challenge prompt, score, channels, spectators, winner | events (duel), chat |
| `session_stats` | session_stats (440) | what this sitting earned, time to next level | session |
| `debug_menu` | debug_menu (470) | offline debug window, tabs from `modules/` | gm, Session.isOffline |
| `gm_panel` | gm_panel (480) | game master panel; sends chat commands | gm, social, chat |
| `options` | - | options window; no `window.ts`, drawn by `src/app/App.tsx` | options and more |
| `_shared` | - | `nearby_players.ts`: `useNearbyPlayers` for party and guild | social |

Other ids in the same stack: msg_window (360) and picked_item (500) from the interface
controller, and the HUD elements in `../hud`.

## Depends on / used by
- uses: `src/modules/*` (through their doors), `Ecs.world`, `src/controllers/interface` (registry, widgets, hooks)
- used by: `../index.ts` (glob); `versions/season6/ui` (sprite lists from `layout.ts`,
  `MasterSkillsWindow`); `src/app/App.tsx` (options)

## Change it
- redraw a window: edit its `index.tsx`, `layout.ts` or `style.less`.
- add a window: new folder with `index.tsx` and `window.ts`; pick an unused `order`. If it belongs
  to an optional module, name it (`module: '<id>'`), so a world without that module hides it.
- change or add a window's words: its `i18n/en.ts` and every other `<code>.ts` there
  ([docs/how_to/add_text.md](../../../../docs/how_to/add_text.md)).
- the Options window's Fidelity page builds its checks from the improvement registry
  (`options/fidelity.tsx`); a new improvement needs no row there.
- one version draws it differently: export it in `windows` from `versions/<id>/ui` with the same id.

## Tests
- `../windowModules.test.ts`: every `module:` names an optional module.
- `gm_panel/commands.test.ts`: every command the panel names resolves against the catalogue.
- `options/search.test.ts`: the options search text normalising and matching.
