# chaos_mix

Chaos machine packets (`CNewUIMixInventory`). The mix state and actions live in the `Economy` store
([../economy/readme.md](../economy/readme.md)); this folder only has the handlers.

## Public API
- none. `installNet()` in `net.ts` registers its handlers (`module.ts`, installed by `src/app/logic.ts`).

## How it works
- The window opens from `NpcWindowResponse(ChaosMachine)` or `(ChaosCardCombination)` and its tray arrives as
  `StoreItemList(ChaosMachine)`; both are handled in [../npc_shop/net.ts](../npc_shop/readme.md).
- Items go in and out with ordinary `ItemMoveRequest`s to `StorageKind.ChaosMachine` (wire byte 9 for the
  Chaos Card Master, `Economy.mixWireStorage`), answered by `ItemMoved`.
- The mix button is `Economy.mix` (`ChaosMachineMixRequest` with the chosen `MIX_MENU` entry); closing is
  `Economy.closeMix` (`CraftingDialogCloseRequest`).

## Packets
- `ItemCraftingResult`: the tray is emptied and, on success, gets the result item; `Economy.craftingResult`
  plays the sounds and prints the reason.
- `CraftingDialogClosed075`: the server closed the window; closes it without sending a close back.

## Depends on / used by
- uses: `economy/economy.ts`, `controllers/item_rules/itemSerializer.ts`.
- used by: `src/app/logic.ts`. The window is `versions/shared/ui/windows/chaos_machine/`.

## Change it
- handle a new mix packet: add an `EventBus.on(...)` here, keep state in `Economy`.
- add a crafting to the menu: `MIX_MENU` in `economy/economy.ts`.

## Tests
- none yet.
