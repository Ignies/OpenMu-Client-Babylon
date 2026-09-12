import type { ISystemFactory } from '../world';
import { flushPropBatches, updatePropBatches } from '../../common/propBatches';

/**
 * Drives the prop batches (`common/propBatches.ts`): builds the types whose
 * prototype model has arrived, and keeps the built chunks in step with the
 * shadow state, the Classic torch light and a snow map's cover. The
 * batches themselves are created and torn down by `loadMapIntoScene`.
 */
export const PropBatchSystem: ISystemFactory = world => ({
  update: dt => {
    flushPropBatches(world);
    updatePropBatches(world, dt);
  },
});
