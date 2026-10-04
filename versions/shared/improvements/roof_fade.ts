import { defineImprovement } from '@/controllers/fidelity';

/**
 * Roofs fade out while the hero stands under them, so the camera sees inside (Lorencia, Devias).
 * Classic: roofs stay drawn; the original's only object fade is Chaos Castle's (ZzzObject.cpp:228).
 * Read in `src/ecs/systems/ceilingHideSystem.ts`; the roof detection (`roofDetection.ts`) runs on
 * every preset.
 */
export default defineImprovement({
  id: 'roofFade',
  preset: 'enhanced',
  labelKey: 'fidelity.roofFade',
  hintKey: 'fidelity.roofFade.hint',
});
