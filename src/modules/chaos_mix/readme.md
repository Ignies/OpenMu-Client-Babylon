# chaos_mix

Chaos machine packets and recipes (`CNewUIMixInventory`, `CMixRecipeMgr`). The mix state and actions live
in the `Economy` store ([../economy/readme.md](../economy/readme.md)); this folder has the handlers and the
`Mix.bmd` matcher.

## Public API
- none for the app. `installNet()` in `net.ts` registers its handlers (`module.ts`, installed by `src/app/logic.ts`).
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
  the Chaos Card Master is type 8. The type only picks the recipes, the server does not see it.
- Recipe names and texts are `Text.bmd` lines, so they are English in every language (every pack ships the
  same English file).

## Packets
- `ItemCraftingResult`: a success or a failure empties the tray (a success then holds the result); a refusal leaves it; `Economy.craftingResult`
  plays the sounds and prints the reason.
- `CraftingDialogClosed075`: the server closed the window; closes it without sending a close back.

## Depends on / used by
- uses: `economy/economy.ts`, `controllers/item_rules/itemSerializer.ts`, `controllers/assets` (`mixRecipes`, `globalText`).
- used by: `src/app/logic.ts`. The window is `versions/shared/ui/windows/chaos_machine/`.

## Change it
- handle a new mix packet: add an `EventBus.on(...)` here, keep state in `Economy`.
- a recipe check the original makes and this lacks: `mixRecipes.ts`, citing MixMgr.cpp.

## Tests
- `mixRecipes.test.ts`: the real `Mix.bmd` - the fruit, a +10 upgrade with and without luck, the closest
  recipe's source statuses, the chaos weapon zen and what the tray accepts.
