# interface

The interface controller: the window registry, the shared widgets every window draws with,
hot keys, the game cursor and the small UI services (name tags, notices, page title). The
windows themselves are content in `versions/shared/ui/` (see
[docs/content.md](../../../docs/content.md)).

## Public API
- `index.ts`: the facade (`MuWindows`, `MsgBox`, `MsgWinCode`, `buildItemTooltip`, `itemNameColor`,
  `TooltipLine`, `ItemLinkHover`). The other root files are public too; `hooks/index.ts` and each
  `components/<widget>/index.tsx` are the doors into those folders.
- `uiState.ts`: `AppState` (the page the app shows, `uiState`, and the hide-interface key,
  `hudHidden`) and `UIState`. Session and hero packets move the page; it imports only mobx.
- `windows.ts`: `defineWindow({ id, slot, order, component, module? })` (`module`: the optional
  gameplay module the window belongs to; the world page hides it while that module is off),
  `registerWindows(defs)` (a later
  def with the same id replaces the earlier one), `unregisterWindow(id)` (a module's window when the
  module goes), `windowsIn(slot)` (stacking order; observable, so the world page redraws when a
  window comes or goes). Slots: `world` (on the 3D view, stays up when the interface is hidden) and `hud`.
- `windowManager.ts`: `MuWindows`: open state (`isOpen(id)`, `setOpen(id, open)`), placement,
  scale and z-order, Escape closes the top window, `closeAll()` is the original's `HideAll` (every
  open flag drops, then every stacked closer runs with the interface sounds off, `quietUiSounds`; the
  closers of the windows that hiding the interface unmounted are kept for it until the interface is back).
- `components/`: shared widgets. Frames and text: `mu_window` (item window, table frame),
  `mu_frame`, `msg_box_frame` (`top` takes the NPC menus' title bar art, `MSGBOX_TOP_TITLEBAR_SPRITE`), `mu_text`, `mu_number`,
  `mu_button`, `mu_sprite`, `mu_logo`, `mu_flag`. Items: `item_icon`, `item_search` (the grid, the
  tooltip, the carried item and the chat item link read the inventory, hero, pets and merchant, so
  they live in `versions/shared/ui/components/`). Text: `mu_text`
  also holds `TEXT_COLOR`, the pre-game and dialog colours. `module_window`: the frame a module's
  window draws in (`ModuleWindowFrame`: item window, title, its hot key unless a built-in action
  has that key; `src/modules/_api`). Other: `msg_window`, `game_cursor`
  (`setRepairCursor(read)`: the app hands it the merchant's repair mode), `world_label`,
  `ui_stage` (the 640x480 stage scale).
- `keyBindings.ts`: `KeyBindings`, `keyFor`, `isKey`, `actionOfKey`, `setKeyBinding`,
  `setKeyProfile`, `WALK_KEYS`; `browserHotkeys.ts`: `installBrowserHotkeyGuard`,
  `toggleFullscreen`, `isBrowserChord`.
- `itemTooltip.ts`: `buildItemTooltip`, `itemDisplayName`, `itemNameColor`, `socketOptionText` (one socket's
  "element(name value)", also the seed researcher's socket list); `itemLinkHover.ts`.
- `nameTags.ts`: name balloon lifetimes and colours; `screenPositionBus.ts`: per-entity screen
  positions; `slideHelp.ts`: `SlideHelp`; `msgWin.ts`: message box codes and text, and `MsgBox`: the box
  that is up (`msgWin`), `popUpMsgWin(code, arg?, onOk?)`, `takeMsgWinOk()`, `closeMsgWin()`. `onOk`
  is the box's Yes and gets the typed text (`msg_window` hands it over), so a chain of boxes, like
  the delete-character one, lives with whoever raises it.
- `hooks/`: `useEventBus`, `usePositionOnScreen`, `useRenderId`, `useVersionUi`.
- `mobile.ts` (`isMobileDevice`, `useIsMobile`), `hudFormat.ts`, `tokens.less` (web tokens),
  `root.less` (the root layer pages and windows are drawn in; `boot.tsx` imports it).

## How it works
- `versions/shared/ui/index.ts` registers every `window.ts` under `windows/` and `hud/` by glob,
  then the controller's `msg_window` and the ui's `picked_item`, then the version's windows (same id
  replaces). `versions/shared/ui/pages/world` draws `windowsIn('hud')` and `windowsIn('world')`.
- `itemTooltip.ts` is `RenderItemInfo` (ZzzInventory.cpp:2091) as data: a list of coloured lines
  drawn by `versions/shared/ui/components/item_tooltip` (its `placement.ts` places it like the original:
  centred on the cursor, below the cursor art, flipped above, inside the viewport).
  An ancient piece carries its set name, its stat bonus line (`RenderDefaultOptionText`) and the set
  block (`RenderSetOptionListInItem`); the caller hands in the worn items and whether the item sits
  in the bag (`TooltipExtras`), since this controller cannot read the hero. The requirement lines and
  `usable` add the stats the worn items give (`withWornStats`, ZzzInventory.cpp:4816-4927). The 380 option, Jewel of
  Harmony and socket blocks read `assets/mu/itemOptionFiles.ts`; a socket value of the level / life /
  mana kind needs the hero's master level and maximums, also from `TooltipExtras`. Wings list their wing
  options before skill and luck and name the additional option by its kind; the Horn of Fenrir is
  named for its variant and has its own block (ZzzInventory.cpp:5160-5222).
- `nameTags.ts`: the original's name balloons (`CHAT`, ZzzInterface.cpp:703): a name shows while
  hovered, 100 ticks on creation, refreshed to 10 per hovered frame; chat lines keep it up for
  their own lifetime; lines of 20+ characters split (`CutText`, ZzzInterface.cpp:605).
- `screenPositionBus.ts`: a listener hears only its own entity, instead of every overlay
  filtering one global event (n squared calls a frame).
- `ui_stage`: one observer on the canvas rect scales the 640x480 stage (`ConvertX` /
  `ConvertY`); `mu_text` maps the original's four GDI Tahoma faces (Winmain.cpp:1251-1254).
- `item_icons/`: the generated fit table (`tools/itemIconFit.ts`) and the per-item inventory scale
  from `RenderObjectScreen` (ZzzInventory.cpp:8906-9674). Do not edit. Which icon files exist is
  `assets/itemIconManifest.ts` (`tools/itemIconManifest.ts`).
  `liveItemIcon.ts` (on `item_icons/index.ts`): the slot `item_icon` asks for an icon the pack has no
  file for (`liveItemIcon(item)`, observable, asked once per look until `forgetLiveItemIcons()`, which
  the app's source calls when the item-effects option changes); the app fills it at boot
  (`setLiveItemIcons`) with `actors/itemIcon.ts`, which draws the model as `RenderItem3D` does. The
  interface never reaches the scene. The live picture is framed like the original's square, so it
  takes no fit.
  `itemIconPose.ts` (on the index): `itemIconPose(group, num, level, twoHand)`, how the original
  draws an item in a bag square, ported as data: `RenderObjectScreen`'s two if / else-if chains of
  angles and `Position` offsets, the switches and scale-chain offsets after them, the body height
  (ZzzInventory.cpp:7653-9026), `RenderItem3D`'s anchor in the squares (:9712-10056) and the model
  the bag swaps in for the Heart and Rena levels (the only swaps of items the pack has no file for;
  the rest are pack icons). The rows keep the original's order and line numbers; branches that can
  never match an item are left out (the file head lists them). The item under the cursor turns
  (`spinLiveItemIcon(item, canvas, ready)`, the slot the app fills with `setLiveItemSpin`): `item_icon`
  takes `spin` from the bag, its equipment sockets and the shared item grid while nothing is held, and
  lays a canvas over the still picture, which goes once the first turned one is drawn. The gamble
  boxes (13/71-75) also spin in the original while not hovered; a still picture keeps their 180, as
  one live target is the cost.
- `keyBindings.ts`: each action maps to a `KeyboardEvent.code`, stored in localStorage per
  character (`setKeyProfile`), rebound from the Options Keys tab. The defaults are the original's
  keys; our own windows take keys no handler of the original reads (`NewUIHotKey.cpp`,
  `ZzzInterface.cpp`): the session panel is F6, since U is the window menu. `MOVED_DEFAULTS` moves a
  saved profile off a default that changed.
- Dependency direction (a controller never imports a module): what read module state left. The
  skill icon and tooltip, `emoji_text` and `reconnect_overlay` went up to
  `versions/shared/ui/components/`; `stateWarnings.ts` to `modules/hero/`, `pageTitle.ts` to
  `modules/servers/`; `chat_item_link` takes its label as a prop; `TEXT_COLOR` came down from
  `pages/server_select/layout.ts` into `mu_text`; `stableKeyOf` (item grid) is `core/stableKey.ts`.

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
- uses: `core` (event bus,
  storage, `stableKey`), `assets` (sprites, item icon pack), `item_rules`, `settings`, `pets`, `i18n`,
  `version`.
- used by: `versions/shared/ui` (every window), `versions/<id>/ui`, `app` (boot, App),
  ECS systems (name tags, screen positions, input), several modules, `loading/classic`.

## Change it
- add a window or HUD element: add `versions/shared/ui/{windows,hud}/<name>/window.ts` with
  `export default defineWindow({...})` (see
  [docs/how_to/change_a_window.md](../../../docs/how_to/change_a_window.md)).
- restyle a shared widget (frame, button, text): edit it in `components/`; every window follows.
  The tooltip and the grid are in `versions/shared/ui/components/`.
- add a hot key: a `KeyAction`, its label key and default in `keyBindings.ts`.

## Tests
- `browserHotkeys.test.ts`: which chords are blocked, Cmd as Ctrl, fields, devtools, F12.
- `keyBindings.test.ts`: U is the window menu, the session panel F6, a saved profile moved off U.
- `hudFormat.test.ts`: experience percent and grouping, durations, dashes before data.
- `nameTags.test.ts`: hero state messages, self-defence parsing, PK colours, outlaw body light.
- `screenPositionBus.test.ts`: the frame-end listener runs once per pass.
- `windowManager.test.ts`: open state reacts, including the first open of an unseen id; `closeAll`.
- `windows.test.ts`: a window dropped from the registry, and a slot reader that sees it come and go.
- `components/module_window/index.test.tsx`: the module frame draws only while open; its hot key
  never takes a built-in action's key.
- `components/item_tooltip/placement.test.ts`: tooltip and compare-pair placement.
- `itemTooltip.test.ts`: tooltip lines and name colours against `RenderItemInfo`: ancient sets, pets, harmony,
  sockets, 380 options, wings, the Horn of Fenrir, stack counts.
- `item_icons/itemIconFit.test.ts`: every Box of Luck level and the newer icons have a fit entry; the
  scale table cites the chain where the original has it.
- `item_icons/itemIconPose.test.ts`: a test per rule group against the original's numbers: weapons
  (hands, the Kris, the sticks, bows, books, shields, the after-switch), armour (the Queen set's default
  and body heights, the lucky sets, named pieces), wings, orbs, seeds and packed jewels, helpers (the
  360 range, the second chain over the first), potions and scrolls (the Heart and Rena levels and
  their models, angle-less branches, the chocolate boxes, refine stones, parchments) and the anchors.
- `item_icons/liveItemIcon.test.ts`: nothing asked while the slot is empty; one ask per look, the URL
  reaching an observer; the look key; every look asked again after `forgetLiveItemIcons`; a failed draw
  answers null once; the spin slot hands the look,
  the canvas and its stop through.
- `components/item_icon/index.test.tsx`: a hovered icon holds the spin canvas over its still picture.
