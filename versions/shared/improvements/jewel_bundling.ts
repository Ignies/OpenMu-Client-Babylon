import { defineImprovement } from '@/controllers/fidelity';

/**
 * A right click on a jewel in the bag bundles 10, 20 or 30; on a packed jewel it unbundles it, without
 * Lahap. Classic: jewels are packed only at Lahap (`COMGEM`, CComGem.cpp). Read in
 * `modules/chaos_mix/jewelMix.ts`. The world's `server.json` must allow it (`jewelBundling`).
 */
export default defineImprovement({
  id: 'jewelBundling',
  preset: 'enhanced',
  labelKey: 'fidelity.jewelBundling',
  hintKey: 'fidelity.jewelBundling.hint',
  server: 'jewelBundling',
});
