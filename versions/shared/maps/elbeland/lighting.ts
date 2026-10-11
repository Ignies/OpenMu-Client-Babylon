import type { MapLighting } from '@/controllers/lighting';
import { ELBELAND_LIGHTS } from './spec';

/** Elbeland's lighting (`MapLayer.lighting`), read by the lighting controller. */
export const ELBELAND_LIGHTING: MapLighting = {
  /**
   * The one map whose bake is already at level, so it takes no lift.
   * `World52/TerrainLight.jpg` measures p50 0.63 with 22.6 % of it pure
   * white, against Lorencia's 0.53 and 8.3 %. `keyGain` lands after the
   * ground light's ceiling, so on a tile the bake already saturates the
   * default +1.3 multiplies a 1.0 by 2.46 and takes the texture with it.
   *
   * Measured against the Classic frame at six walkable spots (ground p50,
   * Classic / +1.3 / +0.3): 0.54/0.64/0.54, 0.52/0.64/0.54, 0.67/0.69/0.62,
   * 0.26/0.41/0.30, 0.71/0.73/0.64, 0.58/0.66/0.62. +0.3 lands on the frame
   * it is grading and drops Classic's own clipping (up to 6.2 % on the
   * marble) to nothing; +1.3 sat a tenth of a stop of luma above it with the
   * highlights flat.
   */
  look: {
    ev: 0.3,
    sky: {
      zenith: [0.48, 0.68, 0.86],
      horizon: [0.76, 0.82, 0.76],
      clouds: 0.14,
    },
  },
  objectLights: ELBELAND_LIGHTS,
};
