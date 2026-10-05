import { defineImprovement } from '@/controllers/fidelity';

/**
 * Lamp lights and flares the original never draws. Flares: Lorencia's street lamp (90) and table
 * candle (150), the Devias hearths (66) and candelabra (54, 56), Elbeland's blue fire bowls (61) and
 * the Lost Tower braziers (23). Fire: the candle wicks (Lorencia 150, Devias 54 and 56). Ground
 * light: the Devias candelabra, the Lost Tower's lamps, machines and braziers (18, 19, 20, 23), the
 * fire vents (Vulcanus and Doppelganger 2 6, Loren Market 57), the Noria forge (39), the Stadium
 * braziers (9) and the Blood Castle candelabra (11). Its shape and place: Lorencia 90 and 150's
 * steeper, brighter floor pools, 90's at its glass, and Elbeland 61's fire dropped into its bowl.
 * Classic: none of these, as the original (ZzzObject.cpp:2853-2912, :2939-2946, :3161-3175,
 * :3781-3785, :3810-3814, :3874-3876, :3923-3985, :4583-4590, :4658-4660; GMNewTown.cpp:135-140,
 * :282-288; GM_PK_Field.cpp:252-264, :363-386; GMDoppelGanger2.cpp:62-72, :488-511;
 * GMUnitedMarketPlace.cpp:128-136, :296-318; a linear `AddTerrainLight` at `o->Position`,
 * ZzzLodTerrain.cpp:938-968). Read in those maps' `spec.ts` rows, `lorencia/candleObject.ts`,
 * `devias/candleObject.ts` and `bloodcastle/candelabraObject.ts`.
 */
export default defineImprovement({
  id: 'lampFlares',
  preset: 'enhanced',
  labelKey: 'fidelity.lampFlares',
  hintKey: 'fidelity.lampFlares.hint',
});
