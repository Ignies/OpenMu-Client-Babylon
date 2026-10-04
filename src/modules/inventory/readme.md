# inventory

The hero's bag: the inventory packets, the grid model every item window shares (storage numbers,
sizes, slot spaces, bans) and the item runs built on it (auto-arrange, bulk move, Ctrl-click,
jewels, Q/W/E/R hotkeys), and `Bag`: the carried item, the move in flight and the item actions. The
items themselves are the hero's (`Hero.items`, `Hero.money`).

## Public API
- `InventoryConstants` (now `src/core/inventoryConstants.ts`, pure, also read by the cash shop server):
  equipment slot indices, `RowSize`, `InventoryRows`, `FirstStoreItemSlotIndex`, `WarehouseRows`.
- `StorageKind`, `VAULT_*` / `TRADE_*` / `MIX_*` / `PERSONAL_SHOP_*` sizes, `CHAOS_CARD_WIRE_STORAGE` (`itemStorage.ts`).
- `gridFirstIndex`, `wireSlotOf`, `localIndexOf`, `storageColumns`, `storageRows`: local index vs wire slot per storage.
- `isVaultBanned`, `isTradeBanned`, `isPersonalShopBanned`, `storageBan(storage, item)`: what a grid refuses.
- `isEquipable(slot, item)`, `equipDestination(item, worn)` (`controllers/item_rules/equipSlots.ts`): where an
  item can be worn; there because the compare tooltip reads them.
- `findFreeSlot(occupied, rows, w, h)`: first-fit free square (`FindEmptySlot`).
- `itemSquares`, `stampSquares`, `squareFits`: grid footprint helpers (`inventoryLayout.ts`).
- `InventorySort.start()`: auto-arrange. `BulkMove.start(from, to, wanted)`: move every matching item.
- `QuickItemActions`: Ctrl-click moves, sell / drop confirmations, the merchant's bulk buy. `MAX_BULK_BUY`.
- `isUpgradeJewel`, `jewelTargetError`, `JEWEL_OF_CHAOS` (`jewelUpgrade.ts`; versions re-export it as `jewelRules`).
- `ITEM_HOTKEY_CODES`, `canRegisterItemHotkey`, `findHotkeyItem`, `countHotkeyItems`, `HOTKEY_COUNT`, `UNBOUND_HOTKEY`.

## How it works
- State is `Bag` (`state.ts`, through `index.ts`, the door): `pickedItem`, `pendingItemMove`, `itemHotkeys`
  (open state: `MuWindows.isOpen('inventory')`; the items are `Hero.items`). Actions: `pickItem`, `placePickedItem`, `cancelPickedItem`,
  `moveItemToSquare`, `autoMoveItem`, `findFreeSquare`, `itemsOfStorage`, `confirmItemMove`, `rollbackItemMove`,
  `applyPickedJewel`, `consumeItemRequest`, `upgradeInventoryItem`, `setItemHotkey`, `useItemHotkey`,
  `learnSkillItem`, `dropPickedItem`, `beginItemMove`. `beforeConsume` is the npc_shop's hook: a use
  closes the merchant window first. The door also exports `itemSize`, `ITEM_MOVE_TIMEOUT`, `PickedItem`.
- The server owns every grid. A move is one `ItemMoveRequest`; only one is in flight (`Bag.pendingItemMove`).
  `ItemMoved` paints it, `ItemMoveRequestFailed` rolls it back. `Bag.itemsOfStorage` maps a `StorageKind`
  to the bag or to an `Economy` grid, so pick / place code is written once. The economy hands its
  grids in (`Bag.grids`, type `EconomyGrids`) when it loads, so the bag never imports it back.
- Local index vs wire slot: the bag array starts with the 12 worn slots; the personal shop sits inside the
  inventory storage at `FirstStoreItemSlotIndex` on OpenMU, so only its slots are shifted.
- `InventorySort` and `BulkMove` are small state machines: send one move, wait for the answer (a mobx
  `reaction` on `pendingItemMove`), plan again. A step does nothing while the player holds an item.
  `inventoryLayout.ts` is the pure packing (by kind, big items first, first fit).
- Ctrl-click: `quickItemRules.ts` decides (storage window wins over the merchant, valuable items ask first),
  `quickItemActions.ts` sends the same requests a drag would. Ctrl-click needs `GameOptions.quickItemActions`,
  the yes/no needs `GameOptions.confirmValuableItems`.
- Jewels: `jewelTargetError` mirrors `ApplyJewels` (NewUIMyInventory.cpp:1546); the server has the last word.
- Hotkeys: a slot holds an item kind, not an item (`CNewUIItemHotKey`, NewUIMainFrameWindow.cpp:929-1320).

## Packets
- `CharacterInventory`: the full bag; slots past `FirstStoreItemSlotIndex` go to `Economy.myShopItems`.
- `ItemMoved`: the server's answer to a move, into any storage (chaos card byte 9 maps to the chaos machine).
- `ItemMoveRequestFailed`: rolls the move back.
- `ItemAddedToInventory`: one slot set, with the pickup sound (WSclient.cpp:5727-5734). `ItemRemoved`: one slot cleared.
- `InventoryItemUpgraded` / `ItemConsumptionFailed`: the result of a jewel or a consume.
- `ItemDurabilityChanged`, `InventoryMoneyUpdate`: durability of one slot, zen in the bag.

## Depends on / used by
- uses: `session` (sending), `hero` (the items), `skills` (`HeroSkills`, learning from a scroll),
  `controllers/item_rules` (`ItemSerializer`, `itemDef`, `dropTier`), `economy` (`Economy`, which reads
  `Bag` back), `controllers/settings`,
  `controllers/sound`, `controllers/net/roundTrip`, `controllers/assets/itemIconPack`, `src/i18n`.
- used by: `src/app/logic.ts` (net), `npc_shop`, `economy`, `personal_shop`, `controllers/item_rules/itemCompare.ts`, `hero`, `mu_helper`,
  `warp`, `scope`, `marketplace`, `cashshop/server/fulfilment.ts`, ecs systems (attack, pickup, keyboard).
- windows: `inventory`, `vault`, `trade`, `chaos_machine`, `personal_shop`, `npc_shop`, `economy_prompts`,
  `character_info`, `pet_info`; HUD `bottom_bar`.

## Change it
- a new inventory packet: add an `EventBus.on(...)` in `net.ts`, keep state in `Bag` (`state.ts`).
- a new storage grid: add it to `storageKind.ts` / `itemStorage.ts` (size, columns, rows), `Bag.itemsOfStorage`
  and `KNOWN_STORAGES` in `net.ts`.
- what a grid refuses: the ban lists in `itemStorage.ts`.
- arrange order: `itemCategory` / `compareSquares` in `inventoryLayout.ts`.
- jewel rules: `jewelTargetError` in `jewelUpgrade.ts`. Hotkey search: `searchRange` in `itemHotkeys.ts`.

## Tests
- `inventoryFit.test.ts`: `findFreeSlot` first fit, edge clipping, ignored slots, row count.
- `inventoryLayout.test.ts`: `planLayout` packs into the top-left, no overlaps, leaves a packed grid alone.
- `quickItemRules.test.ts`: Ctrl-click target, `isValuableItem`, when a bulk buy stops.
- `itemStorage.test.ts`: `storageBan` returns a translated refusal per storage.
