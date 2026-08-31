import type { ISystemFactory } from '../world';
import { effects } from '../../effects';

/**
 * The effects layer's per-frame call site : steps every
 * live visual effect — bolts in flight, burning columns, rings, trails,
 * auras — once a frame after movement, so an effect that follows a body
 * reads this frame's position. `loadMapIntoScene.ts` calls `effects.reset()`.
 */
export const EffectSystem: ISystemFactory = world => ({
  update: dt => {
    effects.update(world.mapIndex, dt);
  },
});
