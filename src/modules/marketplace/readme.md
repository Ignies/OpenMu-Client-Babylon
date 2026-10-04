# marketplace

The player marketplace window's state and its link to the marketplace service and the game
server. The service lives in the repo's `marketplace/` folder; the game server half is an OpenMU
plugin ([../../../openmu/readme.md](../../../openmu/readme.md)).

## Public API
- `Marketplace` (`state.ts`): the window store (tabs, filters, paging, sell form, `confirmBuy()`,
  `cancelListing(id)`, `listForSale()`, `collectPayout()`, `refresh()`). Plus `SORTS`, `formatZen`,
  `sinceLabel`, `Tab`.
- `toggleMarketplace()` (`gameBridge.ts`): syncs Zen and bag from the game, then opens or closes.
- `CATEGORIES`, `displayName(item)` (`categories.ts`); `cancellable`, `stateLabelKey`,
  `statePillKey` (`catalogue.ts`); `lookClasses(item)` (`tiers.ts`): what the window draws.
- `Listing` (`mockListings.ts`), `HistoryEntry` (`api.ts`): row types.

## How it works
- `state.ts` imports no `Store`, so the window can run alone. `gameBridge.ts` is the only adapter:
  it pushes `Hero` money, bag (slots after the equipment) and name into
  `Marketplace.syncFromGame` (an `autorun` while open) and installs `sendEscrow` as the bridge.
- Every commit (list, buy, cancel, collect) is three steps: `api.ts` asks the service for a signed
  token, `sendEscrow` sends it to the game server (`C1 E7 01`, `escrowWire.ts`) and waits up to
  15 s for the result, then the store calls `settle` so the service reads the game database. The
  item and the Zen move through the normal inventory packets. A refused buy calls `release`.
- `api.ts` sends no account name. It trades the socket's session nonce for a ticket (`/session`,
  kept 9 minutes, renewed once on a 401) and puts the nonce on every commit body.
- The catalogue shows only rows the service calls `active` (`catalogue.ts`); the player's own rows
  in every state are on the My Listings tab.
- In a dev build (`APP_STAGE === 'dev'`) the store seeds fixtures (`mockListings.ts`); if the
  service is not reachable it switches to `offline` mode and edits the fixtures locally.

## Packets
- `MarketplaceEscrowResult` (`C1 E7 02`): resolves the waiting `sendEscrow` call for that listing.
- outgoing: the escrow request (`C1 E7 01 <token>`), built by `buildEscrowRequest`.

## Depends on / used by
- uses: `src/app/store.ts` (`playerData`, `gsSocket`, `sendToGS`, `isOffline`, in `gameBridge.ts`
  only), `controllers/net/protocols/escrowWire.ts`, `controllers/net/sessionNonce.ts`,
  `servers/serverServices.ts` (`marketApiUrl`), `core/inventoryConstants.ts`, `src/i18n`.
- used by: `src/app/logic.ts` (`net.ts`), `versions/shared/ui/windows/marketplace/` (the window),
  `versions/shared/ui/hud/bottom_bar/mainFrameButtons.ts` (`toggleMarketplace`),
  `versions/shared/ui/windows/marketplace/dev.tsx` (the harness behind `marketplace.html`).

## Change it
- a new service call: add it to `api.ts`, add it to `MarketApi` in `state.ts` and to
  `mockService.ts`.
- a category rule: `categoryOf` in `categories.ts`.
- card glow tiers: `tierOf` in `tiers.ts`.
- look at the window without a game: `bun run dev`, open `/marketplace.html`.

## Tests
- `api.test.ts`: every commit body carries the session nonce and the ticket.
- `catalogue.test.ts`: `mergeCatalogue`, `isOnSale`, `cancellable`, state labels and pills.
- `state.test.ts`: list, buy, cancel and collect flows against a fake api and bridge.
- `tiers.test.ts`: `tierOf` steps and `lookClasses`.

## Notes
### dev.tsx (`versions/shared/ui/windows/marketplace/dev.tsx`)
- The harness behind `marketplace.html`; it draws, so it lives with the window, not here. It mounts the window alone against fixtures, with
  `mockService.ts` playing both the service and the game server, so list, buy, cancel and collect
  can be walked through with fake tokens.
- It loads the game version first (same as `src/app/main.tsx`), because the item tooltips read the packet
  layer; everything after that is a dynamic import. Dev only, not in the production build.
