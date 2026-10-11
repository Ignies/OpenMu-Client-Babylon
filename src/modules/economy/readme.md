# economy

The `Economy` store: state and actions of the four item windows that sit beside the inventory -
vault, chaos machine, trade and personal shop. The packet handlers that feed it live in
[../vault/](../vault/readme.md), [../chaos_mix/](../chaos_mix/readme.md), [../trade/](../trade/readme.md),
[../personal_shop/](../personal_shop/readme.md) and [../npc_shop/](../npc_shop/readme.md).

## Public API
- `module.ts`: nothing to install; `vault`, `chaos_mix`, `trade` and `personal_shop` require it.
- `Economy`: the mobx store (below).
- `vaultOpenCost(level, masterLevel, locked)`: the vault fee (NewUIStorageInventory.cpp:227).
- `MIX_TYPE`: the chaos machine's mix types (`MIXTYPE_GOBLIN_*`, the Chaos Card Master's 8, the seed NPCs' 10-13).
- `MAX_SHOP_TITLE` (26): the stall title limit. `ShopStock`, `ShopBrowse`, `TradePartner`, `EconomyPrompt`: types.

## How it works
- `Economy` is a store of its own, like `Social`. The inventory's `Bag` owns the picked item and the
  move in flight (the items are `Hero.items`); `Economy` owns the grids that exist only while a window
  is open: `vaultItems`, `mixItems`, `myTradeItems` / `yourTradeItems`, `myShopItems`. `economy.ts`
  hands them to the bag as `Bag.grids` when it loads, and `Bag.itemsOfStorage` maps a `StorageKind`
  to them, so item moves are the same code for every window.
- Vault: `openVault`, `setVaultItems`, `closeVault`, `moveVaultMoney`, `unlockVault`, `setVaultPin`,
  `removeVaultPin`, `vaultProtectionState`; `vaultLocked` / `vaultUnlocked` / `vaultUsable` are the pin state.
- Chaos machine: `openMix(kind)`, `chooseMixType` / `cancelMixMenu` (the goblin's menu), `mix`,
  `craftingResult`, `closeMix` (refuses while items are in the tray); `chaosTaxRate` is the castle's tax on the
  mix zen (`g_nChaosTaxRate`, set by `npc_shop/net.ts`). `mixWireStorage` is the storage byte
  the move packets carry, by mix type (`GetMixStorageType`: 3, 9 for the card master, 11-14 for the seed trays).
- Seed NPCs: `openSeedMenu` (`seedMenu`, the Seed Master's or Seed Researcher's menu), `chooseSeedMix` (its
  tray as mix type 10-13), `closeSeedMenu` (`CraftingDialogCloseRequest`). The researcher's trays list the
  socket item's sockets (`mixSockets`); `selectMixSocket` picks one (`mixSocket`), which `mix` checks
  (`Mix`, NewUIMixInventory.cpp:843-890) and sends as `ChaosMachineMixRequest.SocketSlot` (OpenMU's
  `MountSeedSphereCrafting` / `RemoveSeedSphereCrafting` read it as the socket index). Their results print no line.
  `mixCheck` is the `Mix.bmd` recipe the tray makes ([../chaos_mix/readme.md](../chaos_mix/readme.md)) and
  `mixAccepts` what the tray takes. Results play the mix sounds (WSclient.cpp:6793-6794).
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
  `controllers/sound/sfx.ts`, `controllers/assets` (`itemIconPack.ts`, `mixRecipes`), `controllers/interface/msgWin.ts`,
  `chaos_mix/mixRecipes.ts`, `src/i18n`.
- used by: the nets of `vault`, `chaos_mix`, `trade`, `npc_shop`, `personal_shop`, `inventory`, `scope`, `hero`
  (`reset`), `warp`; `inventory` (`Bag.grids`), `chat/commands.ts`, `session/sessionExit.ts`, `src/app/boot.tsx`,
  ecs `nameTagSystem`.
- windows: `vault`, `chaos_machine`, `trade`, `personal_shop`, `economy_prompts`, `inventory`, `party`;
  HUD `name_tags` (shop titles).

## Change it
- a chaos machine check: `mix()` follows `CNewUIMixInventory::Mix`; recipes come from `Mix.bmd`, not code.
- a new prompt: add a kind to `EconomyPrompt` and its spec in `versions/shared/ui/windows/economy_prompts/`.
- vault, trade or shop behaviour: the matching section of `economy.ts`; the packets in its module's `net.ts`.

## Tests
- `economy.test.ts`: `craftingResult` keeps the tray on a refused mix, empties it on a failure, holds the result on a success;
  the mix button sends the matched recipe's id and nothing when no recipe matches; the tray storage byte per
  mix type; the seed menus; the seed researcher's socket checks and the socket it sends.
