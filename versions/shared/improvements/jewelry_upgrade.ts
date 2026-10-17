import { defineImprovement } from '@/controllers/fidelity';

/**
 * Bless, Soul and Life may be dropped on the common rings and pendants. Classic: ApplyJewels
 * refuses them (NewUIMyInventory.cpp:1546). Read in `modules/inventory/jewelryUpgrade.ts`. Stock
 * OpenMU refuses these upgrades, so the world's `server.json` must allow it (`jewelryUpgrade`).
 */
export default defineImprovement({
  id: 'jewelryUpgrade',
  preset: 'enhanced',
  labelKey: 'fidelity.jewelryUpgrade',
  hintKey: 'fidelity.jewelryUpgrade.hint',
  server: 'jewelryUpgrade',
});
