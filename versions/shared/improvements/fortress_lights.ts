import { defineImprovement } from '@/controllers/fidelity';

/**
 * The wall torches and chandeliers of the Imperial Fortress (day 4) light the ground around them,
 * and the torches burn with a warm flare. Classic: no light, as the original (case 37 is a grey
 * flare alone, case 157 fire and smoke, GMEmpireGuardian4.cpp:864-875, :1050-1098). Read in
 * `versions/shared/maps/empireguardian4/spec.ts`.
 */
export default defineImprovement({
  id: 'fortressLights',
  preset: 'enhanced',
  labelKey: 'fidelity.fortressLights',
  hintKey: 'fidelity.fortressLights.hint',
});
