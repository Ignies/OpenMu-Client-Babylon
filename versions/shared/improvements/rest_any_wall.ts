import { defineImprovement } from '@/controllers/fidelity';

/**
 * A click on any straight wall or fence walks the hero beside it and leans him on it, as at a pose
 * box. Classic: the lean is only at the map's pose boxes (ZzzInterface.cpp:3447-3593, 7395-7411).
 * Read in `src/ecs/systems/restObjectSystem.ts` (`wallRestTarget`). OpenMU regenerates a leaning
 * player faster, so the world's `server.json` must allow it (`restAnyWall`, off by default).
 */
export default defineImprovement({
  id: 'restAnyWall',
  preset: 'enhanced',
  labelKey: 'fidelity.restAnyWall',
  hintKey: 'fidelity.restAnyWall.hint',
  server: 'restAnyWall',
});
