# vault

Vault packets (`CNewUIStorageInventory`). The vault state and actions live in the `Economy` store
([../economy/readme.md](../economy/readme.md)); this folder only has the handlers.

## Public API
- none. `net.ts` registers its handlers when `src/app/logic.ts` imports it.

## How it works
- The vault opens from `NpcWindowResponse(VaultStorage)` and its items arrive as `StoreItemList`; both are
  handled in [../npc_shop/net.ts](../npc_shop/readme.md), which calls `Economy.openVault` / `setVaultItems`.
- Zen moves, the pin and closing go through `Economy`: `moveVaultMoney` (`VaultMoveMoneyRequest`),
  `unlockVault`, `setVaultPin`, `removeVaultPin`, `closeVault` (`VaultClosed`).
- Item moves into and out of the vault are ordinary `ItemMoveRequest`s answered by `ItemMoved`
  ([../inventory/readme.md](../inventory/readme.md)).

## Packets
- `VaultMoneyUpdate`: new vault and bag zen, or a red line when the move failed.
- `VaultProtectionInformation`: pin state (`ProcessToReceiveStorageStatus`, NewUIStorageInventory.cpp:283).
- `VaultClosed`: the server closed it; closes the window without sending `VaultClosed` back.

## Depends on / used by
- uses: `economy/economy.ts`.
- used by: `src/app/logic.ts`. The window is `versions/shared/ui/windows/vault/`.

## Change it
- handle a new vault packet: add an `EventBus.on(...)` here, keep state in `Economy`.
- change the window: `versions/shared/ui/windows/vault/index.tsx`; the pin and zen boxes are in
  `versions/shared/ui/windows/economy_prompts/`.

## Tests
- none yet.
