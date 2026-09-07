import type { ArcRotateCamera } from '../../libs/babylon/exports';
import { grassFieldForFrame } from '../../libs/mu/terrainGrass';
import type { ISystemFactory } from '../world';

/**
 * Residency for the grass field, and nothing else.
 *
 * The field owns every blade mesh (`terrainGrass.ts`); this owns the answer
 * to "which blocks should exist right now", which is a per-frame question
 * about where the camera is and therefore an ECS one. Two jobs, two modules:
 * the system never touches geometry and the field never reads the world.
 *
 * The work per frame is one block build at most, so a warp streams its grass
 * in over the following second or so rather than spending a frame on the
 * whole ring - the frame a warp lands on being the one that can least afford
 * it.
 */
export const TerrainGrassSystem: ISystemFactory = world => ({
  update() {
    const field = grassFieldForFrame();

    if (!field) return;

    // The camera, not the hero: the grass has to be dense where it is being
    // looked at, and those part company as soon as the camera is rotated or
    // pulled back.
    const camera = world.scene.activeCamera as ArcRotateCamera | null;
    const target = camera?.target;

    if (!target) return;

    field.setCenter(target.x, target.z);
    field.step();
  },
});
