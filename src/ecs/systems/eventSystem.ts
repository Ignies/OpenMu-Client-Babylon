import type { ISystemFactory } from '../world';
import { events } from '../../events';

/**
 * The events layer's per-frame call site : steps the
 * match clocks and the 30 s countdown line once a frame, before the HUD
 * reads them. Packets resync the entries; this only counts.
 */
export const EventSystem: ISystemFactory = world => ({
  update: dt => {
    events.update(world.mapIndex, dt);
  },
});
