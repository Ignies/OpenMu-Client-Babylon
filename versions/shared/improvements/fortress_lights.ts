import { defineImprovement } from '@/controllers/fidelity';

/**
 * The wall torches, chandeliers and braziers of the Imperial Fortress (day 4; the login scene is the
 * same set and shares the brazier rows, and days 1-3 light their braziers 79 and the blue lamp 80
 * too) light the ground around them, the torches burn with a warm flare and day 4's brazier 79's
 * flare breathes. Classic: no light, as the original (case 37 is a grey flare alone, 79 and 80 a
 * sprite, 157 fire and smoke, GMEmpireGuardian4.cpp:864-875, :917-948, :1050-1098; days 1-3 the
 * same, GMEmpireGuardian1.cpp:264-278, :1689-1721). Read in `versions/shared/maps/empireguardian4/spec.ts`
 * and `empireguardian/spec.ts`.
 */
export default defineImprovement({
  id: 'fortressLights',
  preset: 'enhanced',
  labelKey: 'fidelity.fortressLights',
  hintKey: 'fidelity.fortressLights.hint',
});
