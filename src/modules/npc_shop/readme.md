# npc_shop

NPC talk and merchant packets (`ReceiveTalk` / `ReceiveShopItemList`, WSclient.cpp). The merchant
state and actions live in `Store` (`src/app/store.ts`); this folder only has the handlers.

## Public API
- none. `installNet()` in `net.ts` registers its handlers (`module.ts`, installed by `src/app/logic.ts`).

## How it works
- `Store.talkToNpc` (called from ecs `npcTalkSystem`) sends `TalkToNpcRequest`; `NpcWindowResponse` says which
  window to open. Merchants open the shop (`Store.openNpcShop`); vault, chaos machine and Chaos Card Master
  open `Economy` windows; Devil Square, Blood Castle, duel watch and Doppelganger open `events` windows;
  legacy quest NPCs open `quests.openNpcWindow`. Anything else gets a notice and a `CloseNpcRequest`, because
  OpenMU otherwise ignores every later talk (TalkNpcAction.cs).
- `StoreItemList` carries the merchant's stock, the vault's items and the chaos machine's tray. `Normal`
  goes to the vault when it is open, the merchant otherwise.
- Merchant state in `Store`: `npcShop` (stock, tax, repair flag), `repairMode`, `shopBuyPending`,
  `shopBuyRefused`, `pendingNpcType`. Actions: `openNpcShop`, `dropNpcTalk`, `setNpcShopItems`,
  `closeNpcShop`, `buyItemFromNpc`, `finishShopBuy`, `shopBuyFailed`, `sellPickedItemToNpc`, `itemSoldToNpc`,
  `toggleRepairMode`, `repairItemRequest`, `repairAllRequest`. Prices come from `controllers/item_rules/itemValue.ts`.
- Bulk buy and the sell confirmation are `QuickItemActions` ([../inventory/readme.md](../inventory/readme.md)).

## Packets
- `NpcWindowResponse`: opens the window the NPC stands for (click + window sounds, WSclient.cpp:6563-6564).
- `StoreItemList`: merchant stock, vault contents or chaos machine tray.
- `ItemBought`: the bought item lands in its bag slot (WSclient.cpp:6653 sound).
- `NpcItemBuyFailed`: marks the buy refused and shows a red line.
- `NpcItemSellResult`: sale confirmed with the new zen, or rolled back.

## Depends on / used by
- uses: `Store`, `economy/economy.ts`, `events`, `quests`, `controllers/item_rules/itemSerializer.ts`, `controllers/sound/sfx.ts`,
  `src/i18n`.
- used by: `src/app/logic.ts`. The window is `versions/shared/ui/windows/npc_shop/`; the buy quantity box is in
  `versions/shared/ui/windows/economy_prompts/`.

## Change it
- open a new NPC window: add a `case` to the `NpcWindowResponse` switch and call `Store.dropNpcTalk()` first.
- merchant buy / sell / repair rules: the matching `Store` methods; prices in `controllers/item_rules/itemValue.ts`.

## Tests
- none yet.
