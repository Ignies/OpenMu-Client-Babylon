import type { ArcRotateCamera } from '../../libs/babylon/exports';
import { grassFieldForFrame, type GrassActor } from '../../libs/mu/terrainGrass';
import type { Entity, ISystemFactory } from '../world';

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
  /**
   * Who can be in the grass, and nothing else.
   *
   * This was `world.with('transform')` - every entity that has a position.
   * On Lorencia that is 2875 of them, 412 within actor range, and 406 of
   * those were static map props: rocks, barrels, fence posts. The press
   * budget is four, so it went to the hero and three pieces of scenery, and
   * because the nearest rock changes as the hero walks, each new one stamped
   * a fresh full-life press that evicted the hero's fading breadcrumbs. Two
   * symptoms, one cause: grass lying flat under nothing visible, and no body
   * ever leaving a path. The ambient birds were in there too, pushing the
   * field aside from six tiles up.
   *
   * A creature is one the server names (`netId`), the local hero, one of the
   * offline maps' own NPCs, or a pet. Nothing else has feet. Four buckets
   * rather than one query filtered per frame: miniplex maintains these
   * incrementally, so the cost is the handful of bodies on the map and not a
   * sweep of every prop on it.
   */
  const groups = [
    world.with('transform', 'netId'),
    world.with('transform', 'localPlayer'),
    world.with('transform', 'npcType'),
    world.with('transform', 'petActor'),
  ];

  const actors: GrassActor[] = [];
  // A server NPC carries both a `netId` and an `npcType`, so the buckets do
  // overlap. Reused across frames rather than allocated per frame.
  const seen = new Set<Entity>();

  return {
    update(deltaTime) {
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
      seen.clear();

      for (const group of groups) {
        for (const e of group) {
          const p = e.transform.pos;

          // Cheap reject before anything else: the field only cares about
          // what is close enough to touch a blade.
          if (Math.abs(p.x - target.x) > ACTOR_RANGE) continue;
          if (Math.abs(p.z - target.z) > ACTOR_RANGE) continue;
          if (seen.has(e)) continue;

          seen.add(e);
          actors.push({ x: p.x, y: p.y, z: p.z });
        }
      }

      field.setActors(actors, deltaTime);
      field.step();
    },
  };
};

/** Tiles from the camera centre past which a body cannot be in shot's grass. */
const ACTOR_RANGE = 24;
