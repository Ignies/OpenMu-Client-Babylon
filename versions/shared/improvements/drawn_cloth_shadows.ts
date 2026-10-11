import { defineImprovement } from '@/controllers/fidelity';

/**
 * Only the cloths a character draws lay a shadow. Classic: every built cloth below `m_byNumCloth` lays one,
 * a skipped cloth where it was left, which never moves (`AddClothesShadowTriangles`, ZzzBMD.cpp:2648-2710; a
 * Dark Lord with a weapon and no cape). Read in `src/controllers/cloth/clothSet.ts` (`runClothFrame`).
 */
export default defineImprovement({
  id: 'drawnClothShadows',
  preset: 'enhanced',
  labelKey: 'fidelity.drawnClothShadows',
  hintKey: 'fidelity.drawnClothShadows.hint',
});
