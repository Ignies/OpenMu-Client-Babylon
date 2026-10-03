import type { ISystemFactory } from '../world';
import {
  updateTerrainDynamicLight,
  uploadTerrainLightDelta,
} from '../../controllers/terrain/terrainDynamicLight';
import {
  pointLightPoolHeldTerrain,
  updatePointLightPool,
} from '../../controllers/lighting/pointLightPool';
import { lightingTier } from '../../controllers/lighting/lightingQuality';
import { lighting } from '../../controllers/lighting';
import { GameOptions } from '../../modules/options/gameOptions';
import { updateSceneLook } from '../../controllers/render/scenes/sceneLook';
import { lookDirector } from '../../controllers/lighting/director';

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
