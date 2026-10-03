# personal_shop

Personal shop (player stall) packets from the game server: your own stall and browsing someone
else's. The state and the actions live in the `Economy` store ([../economy/readme.md](../economy/readme.md)); this folder
only has the handlers.

## Public API
- none. `installNet()` in `net.ts` registers its handlers (`module.ts`, installed by `src/app/logic.ts`).

## How it works
- Ports `CNewUIMyShopInventory` (own stall) and `CNewUIPurchaseShopInventory` (browsing).
- Handlers write into `Economy`: `itemPriceResult`, `sellingStarted`, `sellingStopped`, `itemSold`,
  `setShopTitle` (`shopTitles`), `showShop` (`browsing`), `dropBrowsedShop`, `shopBuyResult`.
- Player ids carry the 0x8000 flag bit like the scope packets; they are masked with `0x7fff` to the
  net id the entities and name tags use.
- `PlayerShopClosed` for the hero only calls `sellingStopped()`. Calling `stopSelling()` would send
  `PlayerShopClose` again and OpenMU answers with another `PlayerShopClosed` (a loop).
- `PlayerShopItemList` slots are mapped to the 8x4 grid with `localIndexOf(StorageKind.PersonalShop)`;
  a slot already inside the grid is used as is.
- A successful buy puts the item straight into `Store.playerData.items` and calls
  `Store.syncPlayerAppearance()`: OpenMU's `BuyRequestAction` sends no `ItemAddedToInventory`.
  `ReceivePurchaseItem` (`WSclient.cpp:9526-9597`) plays no sound, so neither does this.
- Outgoing packets are `Economy` actions: `startSelling` (`PlayerShopOpen`), `stopSelling`
  (`PlayerShopClose`), `setItemPrice`, `browseShop` (`PlayerShopItemListRequest`), `buyFromShop`
  (`PlayerShopItemBuyRequest`), `closeBrowsedShop` (`PlayerShopCloseOther`).

## Packets
- `PlayerShopSetItemPriceResponse`: price set or refused, with the reason text.
- `PlayerShopOpenSuccessful`: the hero's stall is open (or not).
- `PlayerShopItemSoldToPlayer`: one of the hero's items sold, with the buyer's name.
- `PlayerShops`: shop titles over players in scope.
- `PlayerShopClosed`: a stall closed; clears its title and any browse of it.
- `ClosePlayerShopDialog`: the server closes the browse window.
- `PlayerShopItemList`: someone's stall contents; a failure prints a system error.
- `PlayerShopBuyResult`: the bought item and its slot, or the failure kind.

## Depends on / used by
- uses: `economy/economy.ts`, `items/itemSerializer.ts`, `inventory/itemStorage.ts`,
  `social/social.ts` (`errorMessage`), `chat/chat.ts` (`cleanName`), `src/app/store.ts`
  (`playerId`, `playerData.items`, `syncPlayerAppearance`), `src/i18n`.
- used by: `src/app/logic.ts`. The windows are `versions/shared/ui/windows/personal_shop/` and
  `economy_prompts/` (price and buy prompts); `inventory/` opens the stall, `party/` browses one,
  and the name tags (`versions/shared/ui/hud/name_tags/`) read `Economy.shopTitles`.

## Change it
- handle a new stall packet: add an `EventBus.on(...)` in `net.ts`, keep state in `Economy`.
- change a refusal text: the `reason` map in the `PlayerShopSetItemPriceResponse` handler and
  `src/i18n`.
- change what the stall window shows: `versions/shared/ui/windows/personal_shop/index.tsx`.

## Tests
- `playerShopBuyResult.test.ts`: the slot and item read off `PlayerShopBuyResult`.
