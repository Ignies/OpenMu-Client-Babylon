# cash_shop

The cash shop window's state: the catalogue, the order queue and the gacha drop. Products are paid
in Jewels of Chaos. The service behind it lives in the repo's `cashshop/server/` folder.

## Public API
- `CashShopState` (`state.ts`): the observable state (tab, catalogue, account, orders, wallet,
  today's counts, gacha `phase` and `roll`).
- `toggleCashShopWindow(open?)`, `setCashShopTab(tab)`: open or close (starts and stops a 30 s queue
  poll) and switch tab.
- `buy(productId)`, `cancelOrder(id)`: place or take back an order; resolve to whether it worked.
- `rollGacha()`, `openSealed()`, `abandonRoll()`, `canRoll()`: the two halves of the gacha drop.
- `chaosToSpend(items)`, `committedChaos()`, `blockedReason(product, items)`: what the window greys out.
- Types: `Order`, `OrderState`, `Product`, `ProductLine`, `Roll`.
- `gacha.ts`: the drop's tuning tables (`SEAL`, `OPEN`, `TIERS`, `RATTLE_MS`, `SEALED_TINT`,
  `SEALED_COLOUR`, `GACHA_SOUNDS`, `TIER_KEYS`, `isOpening`, `Phase`, `Tier`, `TierLook`).

## How it works
- Every call goes to `shopApiUrl()` with `fetch`. The page's session nonce is traded for a ticket
  (`/session`, renewed 30 s before it expires, retried once on a 401). POSTs also carry the nonce.
- Nothing is spent or counted down locally. The service places every order and its answer is the
  truth. The wallet shown is the service's (bag plus vault minus queued orders) once it confirms the
  account, else the Jewels of Chaos in `items` (`walletOnHand`).
- When a POST gets no answer, the queue is re-read and the new order for that product is looked up
  (`landed`) before the player is told anything.
- Gacha: jewels are only taken at logout, so the service keeps the roll sealed until the order is
  `delivered`. `rollGacha` plays the tier-blind half (fall, feed, rattle, lock). `openSealed` plays
  the reveal on a later open for each delivered roll not yet opened. Opened ids are kept in
  localStorage (`mu_cashshop_opened`, last 200).
- All beats are timers from `gacha.ts`, never `animationend`. Closing the window clears them.
  Under `prefers-reduced-motion` the `SEAL_CALM` / `OPEN_CALM` tables are used. Tier stings follow
  `DSPlaySound.h` (`SOUND_JEWEL01`, `SOUND_MIX_SUCCESS`, `SOUND_LEVEL_UP`).

## Depends on / used by
- uses: `servers/serverServices.ts` (`shopApiUrl`), `controllers/net/sessionNonce.ts`,
  `controllers/sound/sfx.ts`, `inventory/jewelUpgrade.ts` (`JEWEL_OF_CHAOS`), `core/localStorage`,
  `src/i18n`. It does not read the central Store; the window passes `items` in.
- used by: `versions/shared/ui/windows/cash_shop/` only.

## Change it
- tune the drop (timings, tier looks, sounds): `gacha.ts`. The stylesheet reads these values from
  the stage's custom properties; animation lengths stay in `cash_shop/style.less`.
- change what greys a product out: `blockedReason` in `state.ts`.
- prices, products, daily caps and roll odds: the service (`cashshop/server/catalog.ts`,
  `cashshop/server/gacha.ts`), not the client.

## Tests
- none yet.

## Notes
- No sealed-half beat may depend on the roll. A visible tell before payment would let a player spend
  the jewels, fail the delivery and roll again.
