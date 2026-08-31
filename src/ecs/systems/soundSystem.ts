import type { ISystemFactory } from '../world';
import { sound } from '../../sound';

/**
 * The sound layer's per-frame call site : attaches the
 * world once so the listener can find the hero, then steps `sound` — the
 * listener position, the ambient beds (muted by the tile under the hero's
 * feet, so this runs after movement), the map music, the footsteps — once a
 * frame. One-shot entries (ui, combat, monsters) are command-only.
 */
export const SoundSystem: ISystemFactory = world => {
  sound.attach(world);

  return {
    update: dt => {
      sound.update(world.mapIndex, dt);
    },
  };
};
