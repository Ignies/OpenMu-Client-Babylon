# interface

The interface controller: the window registry, the shared widgets every window draws with,
hot keys, the game cursor and the small UI services (name tags, notices, page title). The
windows themselves are content in `versions/shared/ui/` (see
[docs/content.md](../../../docs/content.md)).

## Public API
- `windows.ts`: `defineWindow({ id, slot, order, component })`, `registerWindows(defs)` (a later
  def with the same id replaces the earlier one), `windowsIn(slot)` (stacking order). Slots:
  `world` (on the 3D view, stays up when the interface is hidden) and `hud`.
- `windowManager.ts`: `MuWindows`: open state (`isOpen(id)`, `setOpen(id, open)`), placement,
  scale and z-order, Escape closes the top window.
- `components/`: shared widgets. Frames and text: `mu_window` (item window, table frame),
  `mu_frame`, `msg_box_frame`, `mu_text`, `mu_number`,
  `mu_button`, `mu_sprite`, `mu_logo`, `mu_flag`. Items: `item_grid`, `item_icon`, `item_search`,
  `item_tooltip`, `picked_item`, `chat_item_link`. Skills: `skill_icon`, `skill_tooltip`. Other:
  `msg_window`, `game_cursor`, `guild_marks`, `world_label`, `emoji_text`, `reconnect_overlay`,
  `ui_stage` (the 640x480 stage scale).
- `keyBindings.ts`: `KeyBindings`, `keyFor`, `isKey`, `actionOfKey`, `setKeyBinding`,
  `setKeyProfile`, `WALK_KEYS`; `browserHotkeys.ts`: `installBrowserHotkeyGuard`,
  `toggleFullscreen`, `isBrowserChord`.
- `itemTooltip.ts`: `buildItemTooltip`, `itemDisplayName`, `itemNameColor`; `itemLinkHover.ts`.
- `nameTags.ts`: name balloon lifetimes and colours; `screenPositionBus.ts`: per-entity screen
  positions; `slideHelp.ts`: `SlideHelp`; `msgWin.ts`: message box codes and text.
- `hooks/`: `useEventBus`, `usePositionOnScreen`, `useRenderId`, `useVersionUi`.
- `mobile.ts` (`isMobileDevice`, `useIsMobile`), `hudFormat.ts`, `pageTitle.ts`
  (`watchPageTitle`), `stateWarnings.ts` (`watchStateWarnings`), `tokens.less` (web tokens).

## How it works
- `versions/shared/ui/index.ts` registers every `window.ts` under `windows/` and `hud/` by glob,
  then the controller's own `msg_window` and `picked_item`, then the version's windows (same id
  replaces). `versions/shared/ui/pages/world` draws `windowsIn('hud')` and `windowsIn('world')`.
- `itemTooltip.ts` is `RenderItemInfo` (ZzzInventory.cpp:2091) as data: a list of coloured lines
  drawn by `components/item_tooltip`. `item_tooltip/placement.ts` places it like the original:
  centred on the cursor, below the cursor art, flipped above, inside the viewport.
- `nameTags.ts`: the original's name balloons (`CHAT`, ZzzInterface.cpp:703): a name shows while
  hovered, 100 ticks on creation, refreshed to 10 per hovered frame; chat lines keep it up for
  their own lifetime; lines of 20+ characters split (`CutText`, ZzzInterface.cpp:605).
- `screenPositionBus.ts`: a listener hears only its own entity, instead of every overlay
  filtering one global event (n squared calls a frame).
- `ui_stage`: one observer on the canvas rect scales the 640x480 stage (`ConvertX` /
  `ConvertY`); `mu_text` maps the original's four GDI Tahoma faces (Winmain.cpp:1251-1254).
- `item_icons/`: generated tables (`tools/itemIconFit.ts`, `tools/itemIconManifest.ts`) and the
  per-item inventory scale from `RenderObjectScreen` (ZzzInventory.cpp:9308-10090). Do not edit.
- `keyBindings.ts`: each action maps to a `KeyboardEvent.code`, stored in localStorage per
  character (`setKeyProfile`), rebound from the Options Keys tab.
- `stateWarnings.ts`: watches the store for low durability, a full grid, the last potion and a
  buff running out, and posts one notice per crossing (option `stateWarnings`).

### Notes
- `browserHotkeys.ts`: Ctrl plus a game key is a browser command (Ctrl+W closed the tab mid
  fight). Three layers, strongest first: `keyboard.lock()` in fullscreen (the only way a page
  gets Ctrl+W/T/N/Tab/1..9; Chromium only; F11 asks for fullscreen), `preventDefault` on every
  cancellable chord and the function keys, and `beforeunload` for what neither reaches (Alt+F4,
  Cmd+W). Only the default action is cancelled, so the game still reads the event. Bare keys
  (Tab, Alt, Space) are guarded in `ecs/systems/keyboardInputSystem.ts`.
- `mobile.ts`: nothing else may sniff the user agent or `matchMedia`; the mobile HUD and every
  `.mu-mobile` rule hang off this answer. Touch means coarse pointer and a touch point (either
  alone is a touch monitor or a trackpad). `?mobile=1|0` lasts for the page only, never stored.
  `main.tsx` imports it before the version loads, so it imports nothing.
- `slideHelp.ts` (`CSlideHelpMgr` / `CUISlideHelp`, UIControls.cpp:4033-4530): two lanes, help
  (`g_hFont`) and notice (`g_hFontBold`), each a queue keyed by the second a text is due.
  `ServerMessage` types 10..12 go to help, 13..15 to notice; texts repeat `Count` times `Delay`
  seconds apart, and a stale one (over 60 s) can be dropped. A lane draws a black band at y = 0
  and scrolls in from x = 640, accelerating 1 px/tick to `Speed` (2.5 default), slowing while
  the mouse is on it; `alphaRate` ramps 30 a tick up to 205. The help tips file
  (`OpenSlideTextFile`) is not shipped, so the help lane is packet-only.

## Depends on / used by
- uses: `app/store`, `core` (event bus, storage), `assets` (sprites, item icon pack), `i18n`,
  `version`, many modules (items, skills, options, inventory). The module imports are old
  exceptions listed in `tools/checks/baselines/deps.json`.
- used by: `versions/shared/ui` (every window), `versions/<id>/ui`, `app` (boot, App, store),
  ECS systems (name tags, screen positions, input), several modules, `loading/classic`.

## Change it
- add a window or HUD element: add `versions/shared/ui/{windows,hud}/<name>/window.ts` with
  `export default defineWindow({...})` (see
  [docs/how_to/change_a_window.md](../../../docs/how_to/change_a_window.md)).
- restyle a shared widget (tooltip, grid, frame): edit it in `components/`; every window follows.
- add a hot key: a `KeyAction`, its label key and default in `keyBindings.ts`.

## Tests
- `browserHotkeys.test.ts`: which chords are blocked, Cmd as Ctrl, fields, devtools, F12.
- `hudFormat.test.ts`: experience percent and grouping, durations, dashes before data.
- `nameTags.test.ts`: hero state messages, self-defence parsing, PK colours, outlaw body light.
- `screenPositionBus.test.ts`: the frame-end listener runs once per pass.
- `windowManager.test.ts`: open state reacts, including the first open of an unseen id.
- `components/item_tooltip/placement.test.ts`: tooltip and compare-pair placement.
