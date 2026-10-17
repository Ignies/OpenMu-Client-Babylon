import { defineImprovement } from '@/controllers/fidelity';

/**
 * A personal shop paints each item's asking price under its squares. Classic: the price is only
 * in the tooltip, coloured by amount (ZzzInventory.cpp:2221-2233). Read in
 * `ui/components/item_tooltip/stallPrice.ts` (`gridStallPrice`), drawn by `ui/components/item_grid`.
 */
export default defineImprovement({
  id: 'stallGridPrices',
  preset: 'enhanced',
  labelKey: 'fidelity.stallGridPrices',
  hintKey: 'fidelity.stallGridPrices.hint',
});
