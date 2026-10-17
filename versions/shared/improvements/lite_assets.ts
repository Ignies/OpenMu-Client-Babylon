import { defineImprovement } from '@/controllers/fidelity';

/**
 * Reads the lighter copies a world's client build ships beside the originals (WebP textures and item
 * icons, Opus music; `tools/liteAssets.ts`). Classic: the original files. Read in `modules/servers`
 * (the gate `controllers/assets/liteAssets.ts` asks). The world's `server.json` must say its build
 * wrote them (`liteAssets`).
 */
export default defineImprovement({
  id: 'liteAssets',
  preset: 'enhanced',
  labelKey: 'fidelity.liteAssets',
  hintKey: 'fidelity.liteAssets.hint',
  server: 'liteAssets',
});
