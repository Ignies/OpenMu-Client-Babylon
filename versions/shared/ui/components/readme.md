# components

Shared UI pieces that read a gameplay module's state, so they cannot live in the interface
controller (`src/controllers/interface/components/`, which only draws what it is handed: a
controller never imports a module). Windows, HUD elements and pages import them by folder.

## Public API
- `skill_icon`: `SkillIcon({ number, disabled })`, a skill's 20 x 28 cell (`RenderSkillIcon`); a
  master skill's cell comes from the master tree tables (`modules/skills/masterTree.ts`), loaded on
  first need.
- `skill_tooltip`: `SkillTooltip` (`RenderSkillInfo`) and `MuTipList` / `TipLine`, the tip list the
  experience bar tooltip shares. Reads the skills module (cooldowns, requirements, block reasons).
- `emoji_text`: `EmojiText`, a chat line with its emoji codes drawn as pictures and its item links
  as `ChatItemLink`s (the label from `modules/chat/chatItemLinks.ts`). Reads `modules/chat`.
- `auto_download`: `AutoDownload`, the first-run download screen and panel (lighter assets only); `App.tsx`
  mounts it. See its readme.
- `reconnect_overlay`: `ReconnectOverlay`, the plate over the screen while `SessionResume` walks the
  login flow again (`modules/session`); `App.tsx` mounts it.
- `item_grid`: `ItemGrid`, the square grid every item window draws (`CNewUIInventoryCtrl`), with the
  carried item's drop preview; reads `Bag` (`modules/inventory`). `SQUARE`. `viewOnly` keeps the tooltip
  but swallows clicks (the trade partner's grid). `hoverRelease.ts`: `useHoverRelease` drops a hover
  the pointer left without a pointerleave (a grid turning busy under it); the inventory uses it too.
  `stackNumber.tsx`: `StackNumber`, a stack or pack count in the original's bitmap digits (`MuNumber`) at
  x + width - 6, y + 1 (`RenderNumberOfItem`); the inventory and the NPC shop draw it too.
- `item_tooltip`: `ItemTooltip` (`RenderItemInfo` lines from `controllers/interface/itemTooltip.ts`):
  the price, the repair cost, the pet's level and life, the compare with worn gear; reads `Hero`,
  `Merchant`, `Pets`. `placement.ts` places it at the cursor. `stallPrice.ts`: the stall price colour
  (ZzzInventory.cpp:2226-2233) and `gridStallPrice`, the price under a stall square (`stallGridPrices`).
- `picked_item`: `PickedItem`, the item on the cursor (`CNewUIPickedItem`); reads `Bag`.
- `chat_item_link`: `ChatItemLink`, an item link in a chat line with its tooltip on hover.

## How it works
- Same shape as an interface widget: `index.tsx`, optional `style.less` and `i18n/<code>.ts`.
- Why here: each reads a module (`modules/skills`, `modules/chat`, `modules/session`, `inventory`,
  `hero`, `pets`, `npc_shop`). They moved out of `controllers/interface/components/` to drop those
  controller -> module imports.

## Depends on / used by
- uses: `controllers/interface` widgets (`mu_sprite`, `item_icon`, `mu_window`, `game_cursor`) and its
  door (`buildItemTooltip`, `ItemLinkHover`), `controllers/item_rules`, `controllers/assets`
  (`skillDisplayName`), `controllers/settings`, `controllers/sound` (`uiClick`), `modules/skills`,
  `modules/chat`, `modules/session`, `@versions/shared/skills/skillsDatabase`, `src/i18n`.
- used by: the item windows (`inventory`, `vault`, `trade`, `chaos_machine`, `personal_shop`,
  `npc_shop`, `marketplace`), `versions/shared/ui/index.ts` (`picked_item`),
  HUD `bottom_bar/` (`index.tsx`, `expTooltip.tsx`), `mobile_controls/skillPad.tsx`, `chat/`, `world_objects/`,
  `name_tags/`; windows `skills/`, `mu_helper/`, `chat_room/`; `src/app/App.tsx` (`reconnect_overlay`).

## Change it
- a new shared piece that reads a module: add `<name>/index.tsx` here. One that only draws what it
  is given belongs in `src/controllers/interface/components/`.

## Tests
- `item_grid/hoverRelease.test.ts`: a pointer move outside the grid (or the named squares) drops the hover.
- the skill goldens (`versions/shared/skills/*.golden.test.ts`) pin the data they read.
