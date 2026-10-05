import { defineImprovement } from '@/controllers/fidelity';

/**
 * Lamp lights and flares the original never draws. Flares: Lorencia's street lamp (90) and table
 * candle (150), the Devias hearths (66) and candelabra (54, 56), Elbeland's blue fire bowls (61) and
 * the Lost Tower braziers (23). Fire: the candle wicks (Lorencia 150, Devias 54 and 56). Ground
 * light: the Devias candelabra and the Lost Tower's lamps, machines and braziers (18, 19, 20, 23).
 * Classic: none of these, as the original (ZzzObject.cpp:2887-2912, :3781-3785, :3810-3814,
 * :3874-3876, :3952-3985, :4583-4590, :4658-4660; GMNewTown.cpp:135-140, :282-288). Read in those
 * maps' `spec.ts` rows, `lorencia/candleObject.ts` and `devias/candleObject.ts`.
 */
export default defineImprovement({
  id: 'lampFlares',
  preset: 'enhanced',
  labelKey: 'fidelity.lampFlares',
  hintKey: 'fidelity.lampFlares.hint',
});
