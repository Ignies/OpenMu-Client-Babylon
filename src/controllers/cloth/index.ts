import { ENUM_WORLD } from '@/core/types';
import type { Controller } from '../controller';
import { advanceClothClock } from './clothSet';

export {
  PCT_CURVED,
  PCT_CYLINDER,
  PCT_ELASTIC_RAGE_L,
  PCT_ELASTIC_RAGE_R,
  PCT_FLAT,
  PCT_HEAVY,
  PCT_MASK_ALPHA,
  PCT_MASK_BLEND,
  PCT_MASK_LIGHT,
  PCT_RUBBER,
  PCT_RUBBER2,
  PCT_SHORT_SHOULDER,
  PCT_STICKED,
  PhysicsCloth,
  type ClothSpec,
} from './physicsCloth';
export { ClothSet, runClothFrame, type ClothBody } from './clothSet';
export type { Rgb } from './clothMesh';

/** The cloth clock: stepped every frame by `ClothSystem`; the cloths move on its 25 Hz ticks. */
export const cloth: Controller = {
  id: 'cloth',
  update(map, dt) {
    advanceClothClock(dt, map === ENUM_WORLD.WD_55LOGINSCENE);
  },
};
