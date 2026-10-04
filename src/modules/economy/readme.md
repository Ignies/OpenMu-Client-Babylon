# economy

The `Economy` store: state and actions of the four item windows that sit beside the inventory -
vault, chaos machine, trade and personal shop. The packet handlers that feed it live in
[../vault/](../vault/readme.md), [../chaos_mix/](../chaos_mix/readme.md), [../trade/](../trade/readme.md),
[../personal_shop/](../personal_shop/readme.md) and [../npc_shop/](../npc_shop/readme.md).

## Public API
- `Economy`: the mobx store (below).
- `vaultOpenCost(level, masterLevel, locked)`: the vault fee (NewUIStorageInventory.cpp:227).
- `MIX_MENU`, `MixMenuEntry`: the crafting list the chaos machine window offers.
- `MAX_SHOP_TITLE` (26): the stall title limit. `ShopStock`, `ShopBrowse`, `TradePartner`, `EconomyPrompt`: types.

## How it works
- `Economy` is a store of its own, like `Social`. The inventory's `Bag` owns the picked item and the
  move in flight (the items are `Hero.items`); `Economy` owns the grids that exist only while a window
  is open: `vaultItems`, `mixItems`, `myTradeItems` / `yourTradeItems`, `myShopItems`. `economy.ts`
  hands them to the bag as `Bag.grids` when it loads, and `Bag.itemsOfStorage` maps a `StorageKind`
  to them, so item moves are the same code for every window.
- Vault: `openVault`, `setVaultItems`, `closeVault`, `moveVaultMoney`, `unlockVault`, `setVaultPin`,
  `removeVaultPin`, `vaultProtectionState`; `vaultLocked` / `vaultUnlocked` / `vaultUsable` are the pin state.
- Chaos machine: `openMix(kind)`, `setMixType`, `mix`, `craftingResult`, `closeMix` (refuses while items are
  in the tray). `mixKind` picks the goblin or the Chaos Card Master; `mixWireStorage` is the storage byte
  the move packets carry (9 for the card master). Results play the mix sounds (WSclient.cpp:6793-6794).
- `MIX_MENU` lists every crafting the S6 OpenMU goblin registers (`ChaosMixes.cs`); the player picks the
  recipe and the server decides. `MIX_NUMBER` names the numbers the generated enum lacks.
- Trade: `requestTrade`, `incomingTradeRequest`, `answerTradeRequest`, `openTrade`, `setYourTradeItem`,
  `setTradeMoney`, `setMyConfirm` / `toggleMyConfirm`, `partnerConfirm`, `cancelTrade`, `tradeFinished`.
  A partner change after we accepted is marked in `yourTradeChanged`.
- Personal shop: `toggleMyShop` (level 6+), `setItemPrice`, `stockedShopSquare` (opens the price prompt),
  `startSelling` / `stopSelling`, `sellingStarted`, `itemSold`, `setShopTitle` / `shopTitles`. The hero's own
  title is set locally (WSclient.cpp:8696). Browsing another stall: `browseShop`, `showShop`, `buyFromShop`,
  `closeBrowsedShop`, `shopBuyResult`.
- `prompt` is the one open yes/no or amount box (`openPrompt`, `closePrompt`). `autoMoveTarget` is where a
  right click in the bag sends an item. `reset()` clears everything on character select.
- Offline (`Session.isOffline`) most actions change state locally, or do nothing, instead of sending.

## Depends on / used by
- uses: `session`, `hero`, `inventory` (`Bag`), `Social` (system and error lines), `chat/notices.ts`, `inventory/itemStorage.ts`,
  `controllers/sound/sfx.ts`, `controllers/assets/itemIconPack.ts`, `src/i18n`.
- used by: the nets of `vault`, `chaos_mix`, `trade`, `npc_shop`, `personal_shop`, `inventory`, `scope`, `hero`
  (`reset`), `warp`; `inventory` (`Bag.grids`), `chat/commands.ts`, `session/sessionExit.ts`, `src/app/boot.tsx`,
  ecs `nameTagSystem`.
- windows: `vault`, `chaos_machine`, `trade`, `personal_shop`, `economy_prompts`, `inventory`, `party`;
  HUD `name_tags` (shop titles).

## Change it
- a new crafting in the menu: add it to `MIX_NUMBER` (if the enum lacks it) and `MIX_MENU`, plus the
  `mix.*` text keys.
- a new prompt: add a kind to `EconomyPrompt` and its spec in `versions/shared/ui/windows/economy_prompts/`.
- vault, trade or shop behaviour: the matching section of `economy.ts`; the packets in its module's `net.ts`.

## Tests
- none yet.
