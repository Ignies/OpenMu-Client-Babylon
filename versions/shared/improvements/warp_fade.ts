import { defineImprovement } from '@/controllers/fidelity';

/**
 * A warp to another map from inside the world keeps a still of the old map on screen and dissolves
 * it into the new one. Classic: the loading screen art covers every map change (`SceneFlag`
 * LOADING_SCENE). Read in `controllers/loading/fade` (`warpFades`), started by `app/boot.tsx`.
 */
export default defineImprovement({
  id: 'warpFade',
  preset: 'enhanced',
  labelKey: 'fidelity.warpFade',
  hintKey: 'fidelity.warpFade.hint',
});
