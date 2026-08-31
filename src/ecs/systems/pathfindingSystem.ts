import {
  CreateBox,
  Matrix,
  Mesh,
  StandardMaterial,
} from '../../libs/babylon/exports';
import type { ISystemFactory, World } from '../world';
import { TERRAIN_SIZE } from '../../common/terrain/consts';
import { DEBUG_PATHFINDING } from '../../consts';
import { EventBus } from '../../libs/eventBus';

export const PathfindingSystem: ISystemFactory = world => {
  const query = world.with('pathfinding');

  let init = false;

  EventBus.on('warpCompleted', () => {
    init = false;
  });

  return {
    update: () => {
      if (!world.terrain) {
        return;
      }

      if (!init) {
        init = true;

        world.pathfinder.clear();

        const ids: number[] = [];

        for (let x = 0; x < TERRAIN_SIZE; x++) {
          for (let y = 0; y < TERRAIN_SIZE; y++) {
            const isWalkable = world.isWalkable(x, y);

            if (!isWalkable) {
              ids.push(x * TERRAIN_SIZE + y);
            }
          }
        }

        world.pathfinder.applyClosedPatch(ids);

        if (DEBUG_PATHFINDING) {
          createDebugCells(world);
        }
      }

      for (const { pathfinding } of query) {
        if (pathfinding.calculated) continue;

        pathfinding.path = world.pathfinder.search(
          pathfinding.from,
          pathfinding.to
        );

        pathfinding.calculated = true;

        if (pathfinding.path.length > 0) {
          pathfinding.path[0].x = pathfinding.from.x;
          pathfinding.path[0].y = pathfinding.from.y;
        }
      }
    },
  };
};

let box: Mesh | null = null;
function createDebugCells(world: World) {
  if (box) {
    box.dispose(false, true);
  }

  box = CreateBox(
    '__pathfinding__',
    { width: 0.95, height: 0.15, depth: 0.95 },
    world.scene
  );
  box.position.set(0.5, world.playerEntity.transform.pos.y + 0.1, 0.5);
  const boxMaterial = new StandardMaterial('__pathfinding__mat', world.scene);
  boxMaterial.alpha = 0.75;
  boxMaterial.disableLighting = true;
  box.alwaysSelectAsActiveMesh = true;
  box.material = boxMaterial;

  for (let x = 0; x < TERRAIN_SIZE; x++) {
    for (let y = 0; y < TERRAIN_SIZE; y++) {
      const node = world.pathfinder.getNode(x, y);

      if (node && node.weight < 1) {
        box.thinInstanceAdd(Matrix.Translation(x, 0, y), false);
      }
    }
  }

  box!.thinInstanceBufferUpdated('matrix');
}
