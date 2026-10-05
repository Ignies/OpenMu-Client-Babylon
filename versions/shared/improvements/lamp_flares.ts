import { defineImprovement } from '@/controllers/fidelity';

/**
 * Street lamps, candles, hearths and braziers the original draws without a flare glow with one:
 * Lorencia's street lamp (90) and table candle (150), the Devias hearths (66) and candelabra (54,
 * 56), Elbeland's blue fire bowls (61) and the Lost Tower braziers (23). Classic: no flare, as the
 * original (ZzzObject.cpp:3781-3785, :3810-3814, :3874-3876, :3971-3975, :4583-4590, :4658-4660;
 * GMNewTown.cpp:135-140, :282-288). Read in those maps' `spec.ts` rows and `devias/candleObject.ts`.
 */
export default defineImprovement({
  id: 'lampFlares',
  preset: 'enhanced',
  labelKey: 'fidelity.lampFlares',
  hintKey: 'fidelity.lampFlares.hint',
});
