import { defineImprovement } from '@/controllers/fidelity';

/**
 * The wall torches, chandeliers and braziers of the Imperial Fortress (day 4; the login scene is the
 * same set and shares the brazier rows) light the ground around them, the torches burn with a warm
 * flare and brazier 79's flare breathes. Classic: no light, as the original (case 37 is a grey flare
 * alone, 79 and 80 a sprite, 157 fire and smoke, GMEmpireGuardian4.cpp:864-875, :917-948,
 * :1050-1098). Read in `versions/shared/maps/empireguardian4/spec.ts`.
 */
export default defineImprovement({
  id: 'fortressLights',
  preset: 'enhanced',
  labelKey: 'fidelity.fortressLights',
  hintKey: 'fidelity.fortressLights.hint',
});
