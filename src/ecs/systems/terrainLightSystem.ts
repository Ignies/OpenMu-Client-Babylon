import type { ISystemFactory } from '../world';
import {
  updateTerrainDynamicLight,
  uploadTerrainLightDelta,
} from '../../common/terrainDynamicLight';
import {
  pointLightPoolHeldTerrain,
  updatePointLightPool,
} from '../../common/pointLightPool';
import { lightingTier } from '../../common/lightingQuality';
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
      const camera = world.scene.activeCamera;
      // The pool first: on tiers >= 1 the ground takes its slots per pixel,
      // and the tile map below carries only what the pool does not hold.
      if (camera) {
        updatePointLightPool(elapsedMs, camera);
      }
      const held = lightingTier() ? pointLightPoolHeldTerrain() : undefined;
      updateTerrainDynamicLight(elapsedMs, enabled, held);
      uploadTerrainLightDelta();
    },
  };
};
