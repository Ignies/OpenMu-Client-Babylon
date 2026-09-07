import type { ArcRotateCamera } from '../../libs/babylon/exports';
import { grassFieldForFrame, type GrassActor } from '../../libs/mu/terrainGrass';
import type { ISystemFactory } from '../world';

/**
 * Residency for the grass field, and who is standing in it.
 *
 * The field owns every blade mesh (`terrainGrass.ts`); this owns the answers
 * to "which blocks should exist right now" and "who is in the grass", which
 * are per-frame questions about the world and therefore ECS ones. Two jobs,
 * two modules: the system never touches geometry and the field never reads
 * the world.
 *
 * The work per frame is one block build at most, so a warp streams its grass
 * in over the following second or so rather than spending a frame on the
 * whole ring - the frame a warp lands on being the one that can least afford
 * it.
 */
export const TerrainGrassSystem: ISystemFactory = world => {
  // Anything with a body that could be in the grass: the hero, other players,
  // monsters and NPCs. Reused across frames, never reallocated.
  const bodies = world.with('transform');
  const actors: GrassActor[] = [];

  return {
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

      actors.length = 0;

      for (const e of bodies) {
        const p = e.transform.pos;

        // Cheap reject before anything else: the field only cares about what
        // is close enough to touch a blade.
        if (Math.abs(p.x - target.x) > ACTOR_RANGE) continue;
        if (Math.abs(p.z - target.z) > ACTOR_RANGE) continue;

        actors.push({ x: p.x, y: p.y, z: p.z });
      }

      field.setActors(actors);
      field.step();
    },
  };
};

/** Tiles from the camera centre past which a body cannot be in shot's grass. */
const ACTOR_RANGE = 24;
