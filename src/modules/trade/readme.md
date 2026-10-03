# trade

Player-to-player trade packets (`CNewUITrade`). The trade state and actions live in the `Economy`
store ([../economy/readme.md](../economy/readme.md)); this folder only has the handlers.

## Public API
- none. `installNet()` in `net.ts` registers its handlers (`module.ts`, installed by `src/app/logic.ts`).

## How it works
- Outgoing packets are `Economy` actions: `requestTrade` (`TradeRequest`), `answerTradeRequest`,
  `setTradeMoney` (`SetTradeMoney`), `setMyConfirm` (`TradeButtonStateChange`), `cancelTrade` (`TradeCancel`).
- Our own items go in with ordinary `ItemMoveRequest`s to `StorageKind.Trade`, answered by `ItemMoved`
  ([../inventory/readme.md](../inventory/readme.md)). The partner's items arrive here.
- Any change on either side clears both accept marks, as the server does.

## Packets
- `TradeRequest`: someone asks us to trade; sets `Economy.tradeRequest` (or refuses when a window is open).
- `TradeRequestAnswer`: refused (red line) or accepted, which opens the window with the partner's name, level, guild.
- `TradeItemAdded` / `TradeItemRemoved`: one square of the partner's tray.
- `TradeMoneySetResponse`: the server took our zen amount.
- `TradeMoneyUpdate`: the partner's zen amount.
- `TradeButtonStateChanged`: the partner's accept mark (0 off, 1 on, 2 red: both marks drop).
- `TradeFinished`: the window closes; success, cancel, full bag, timeout or untradable item line.

## Depends on / used by
- uses: `economy/economy.ts`, `items/itemSerializer.ts`, `social/social.ts` (`errorMessage`), `chat/chat.ts`
  (`cleanName`), `src/i18n`.
- used by: `src/app/logic.ts`. The window is `versions/shared/ui/windows/trade/`; the request box and the
  zen box are in `versions/shared/ui/windows/economy_prompts/`.

## Change it
- handle a new trade packet: add an `EventBus.on(...)` here, keep state in `Economy`.
- what cannot be traded: `isTradeBanned` in `inventory/itemStorage.ts`.

## Tests
- none yet.
