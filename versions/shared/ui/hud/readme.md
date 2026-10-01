# hud

Always-on interface elements, one folder per element, same shape as a window. Recipe:
[docs/how_to/change_a_window.md](../../../../docs/how_to/change_a_window.md).

## Public API
- Each `window.ts` default-exports a `defineWindow({ id, slot, order, component })`.
- `party_bars/stableKey.ts`: `stableKeyOf`, also used by `notices` and the item grid widget.

## How it works
- Registered by the same glob as the windows (`versions/shared/ui/index.ts`).
- `slot: 'world'` draws over the 3D view under the HUD and stays up when the hide-interface key is
  pressed; `slot: 'hud'` hides with the rest of the interface. Higher `order` draws on top.

| Folder | id (slot, order) | Shows | Reads |
|---|---|---|---|
| `low_health_overlay` | low_health_overlay (world, 10) | red or blue screen-edge pulse at low health or mana | Store.playerData, options |
| `world_objects` | world_objects (world, 20) | drop names and tooltips (ALT), and hosts name tags, party bars, emoji bubbles | Store.world, drops, options |
| `damage_numbers` | damage_numbers (world, 30) | floating damage, miss and shield numbers | `objectDamaged` events |
| `target_health_bar` | target_health_bar (hud, 10) | the target's name and health bar | Store.world |
| `map_name_banner` | map_name_banner (hud, 20) | the map name picture on entering a map | Store.sceneLoading, events |
| `perf_readout` | perf_readout (hud, 30) | frames, frame time and server round trip | Store.world, options |
| `notices` | notices (hud, 40) | the centred notice stack | chat |
| `slide_help` | slide_help (hud, 50) | the scrolling help band at the top | options |
| `buff_bar` | buff_bar (hud, 60) | the hero's buffs and debuffs with tooltips | skills |
| `bottom_bar` | bottom_bar (hud, 70) | main frame: orbs, potion slots, skill hotkeys and fan, exp bar | Store.playerData, skills, inventory |
| `chat` | chat (hud, 230) | chat input box and chat log | chat, social, options |
| `soccer_score` | soccer_score (hud, 420) | Battle Soccer scoreboard and clock | Store.guilds, social |
| `minimap` | minimap (hud, 450) | full world map on TAB and the corner minimap | Store.world, options, social |
| `mobile_controls` | mobile_controls (hud, 490) | touch HUD: move button, skill pad, menu cluster | Store, skills, warp, social |
| `name_tags` | - | names and guild marks over characters | Store.world, social |
| `party_bars` | - | party member HP pips over heads | social |
| `emoji_bubbles` | - | a character's emoji bubble | chat |

`name_tags`, `party_bars` and `emoji_bubbles` have no `window.ts`; `world_objects` draws them.

## Depends on / used by
- uses: `src/features/*`, the Store, `src/controllers/interface` (registry, widgets, hooks)
- used by: `../index.ts` (glob); `../pages/world` draws them

## Change it
- redraw an element: edit its `index.tsx` and `style.less`.
- add an element: new folder with `index.tsx` and `window.ts`; `slot: 'world'` if it should stay
  up when the interface is hidden.

## Tests
- `low_health_overlay/heartbeat.test.ts`: the heartbeat beats back to back while due, and books
  no next beat once it is not.
- `name_tags/tagSync.test.ts`: the tag layout matches the measuring pass and pushes overlapping
  slots apart.
