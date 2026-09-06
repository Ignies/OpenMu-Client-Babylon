import type { ISystemFactory } from '../world';
import {
  updateTerrainDynamicLight,
  uploadTerrainLightDelta,
} from '../../common/terrainDynamicLight';
import { updatePointLightPool } from '../../common/pointLightPool';
import { lighting } from '../../lighting';
import { GameOptions } from '../../common/gameOptions';
import { updateSceneLook } from '../../scenes/sceneLook';
import { lookDirector } from '../../lighting/director';

/**
 * The lighting layer's per-frame call site: the look director composes the
 * frame's look, then `lighting` steps every source, then the two sinks it
 * registers into - the terrain delta texture and the point-light pool - so
 * everything a source wrote this frame is what the terrain and the objects
 * are lit by this frame.
 */
export const TerrainLightSystem: ISystemFactory = world => {
  return {
    update: dt => {
      lookDirector()?.tick(dt);

      updateSceneLook(world.scene, world.scene.look);

      lighting.update(world.mapIndex, dt);

      const elapsedMs = world.gameTime.TotalGameTime.TotalSeconds * 1000;
      const enabled = GameOptions.dynamicLights;

      updateTerrainDynamicLight(elapsedMs, enabled);
      uploadTerrainLightDelta();

      const camera = world.scene.activeCamera;

      if (camera) {
        updatePointLightPool(elapsedMs, camera);
      }
    },
  };
};
