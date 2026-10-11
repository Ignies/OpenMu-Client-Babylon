# chaos_mix

Chaos machine packets and recipes (`CNewUIMixInventory`, `CMixRecipeMgr`), and Lahap's jewel packing (`COMGEM`). The mix state and actions live
in the `Economy` store ([../economy/readme.md](../economy/readme.md)); this folder has the handlers and the
`Mix.bmd` matcher.

## Public API
- none for the app. `installNet()` in `net.ts` registers its handlers (`module.ts`, installed by `src/app/logic.ts`).
- `jewelMix.ts`: `JewelMix` (which of Lahap's boxes is up and its actions), `JEWELS`, `STACK_SIZES`,
  `combineZen`, `packedJewels`, `singleCount`, `singleJewel`, `packedJewel`. Read by the `lahap` window and
  `npc_shop/net.ts`.
- `mixRecipes.ts`: `checkMix(recipes, tray)` (the recipe the tray makes, the closest one, its rate and zen),
  `isMixSource`, `sourceStatus`, `recipeNameLines`, `recipeTextLines`. Used by `Economy` and the window.

## How it works
- The window opens from `NpcWindowResponse(ChaosMachine)` or `(ChaosCardCombination)` and its tray arrives as
  `StoreItemList(ChaosMachine)`; both are handled in [../npc_shop/net.ts](../npc_shop/readme.md).
- Items go in and out with ordinary `ItemMoveRequest`s to `StorageKind.ChaosMachine` (wire byte 9 for the
  Chaos Card Master, `Economy.mixWireStorage`), answered by `ItemMoved`.
- `checkMix` ports `CMixRecipes` (MixMgr.cpp): every recipe of the open mix type in `Mix.bmd` is tried
  against the tray (`CheckRecipe`), the rate is its token formula (`EvaluateMixRate`), and the closest recipe
  (`CheckRecipeSimilarity`) tells which sources are still missing. `isMixSource` is what the tray accepts.
- The mix button is `Economy.mix`: zen, a matched recipe, its level and bag room, then the confirm box; it
  sends `ChaosMachineMixRequest` with the recipe's `m_iMixID`, which is OpenMU's crafting number
  (`ChaosMixHandlerPlugIn` looks the crafting up by it). Closing is `Economy.closeMix` (`CraftingDialogCloseRequest`).
- The goblin asks first which mix type to match (`CChaosMixMenuMsgBox`: regular, chaos weapon, 380 option);
  the Chaos Card Master is type 8, the Seed Master's trays 10 and 11, the Seed Researcher's 12 and 13 (their
  menus are `Economy.seedMenu`). The type picks the recipes and the storage byte; the mix id goes out.
- `checkMix` keeps the recipes' 'H' and 'I' options: a weapon takes a fire, ice or lightning sphere, armour a
  water, wind or earth one (`CheckRecipeSub`, MixMgr.cpp:370-371). The refinery's 'G' is not ported.
- Recipe names and texts are `Text.bmd` lines, so they are English in every language (every pack ships the
  same English file).

## Lahap (jewelMix.ts)
- `NpcWindowResponse(Lahap)` opens `CGemIntegrationMsgBox` (WSclient.cpp:6446-6454): combine or dismantle. Combine
  picks one of the ten jewels, then 10, 20 or 30 of it (`CheckMyInvValid` counts the single jewels past the
  equipment, 50,000 zen each); Dismantle lists the packed jewels (`FindWantedList`, 1,000,000 zen). OK on the
  check sends `LahapJewelMixRequest` (Mix: jewel, stack size; Unmix: jewel, bundle level, slot) and then
  `CloseNpcRequest` (`COMGEM::Exit`), as the original does; every Close sends the close too.
- OpenMU (`JewelMixHandlerPlugIn` / `ItemStackAction`, master) takes the same bytes while Lahap's dialog is
  open, and answers with the inventory packets and its own blue messages. It never sends the original's
  jewel mix result (`ReceiveGemMixResult`, WSclient.cpp:8546-8625), so those result boxes are not ported.

## Packets
- `ItemCraftingResult`: a success or a failure empties the tray (a success then holds the result); a refusal leaves it; `Economy.craftingResult`
  plays the sounds and prints the reason.
- `CraftingDialogClosed075`: the server closed the window; closes it without sending a close back.

## Depends on / used by
- uses: `economy/economy.ts`, `hero`, `session`, `social`, `controllers/item_rules/itemSerializer.ts`, `controllers/assets` (`mixRecipes`, `globalText`).
- used by: `src/app/logic.ts`, `npc_shop/net.ts` (`JewelMix`). The windows are `versions/shared/ui/windows/chaos_machine/` and `lahap/`.

## Change it
- handle a new mix packet: add an `EventBus.on(...)` here, keep state in `Economy`.
- a recipe check the original makes and this lacks: `mixRecipes.ts`, citing MixMgr.cpp.

## Tests
- `jewelMix.test.ts`: the bag Lahap counts, the combine and dismantle requests and their zen, the refusals.
- `mixRecipes.test.ts`: the seed sphere application recipes; the real `Mix.bmd` - the fruit, a +10 upgrade with and without luck, the closest
  recipe's source statuses, the chaos weapon zen and what the tray accepts.
