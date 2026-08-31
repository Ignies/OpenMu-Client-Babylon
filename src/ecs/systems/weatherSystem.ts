import type { ISystemFactory } from '../world';
import { weather } from '../../weather';

/**
 * The weather layer's per-frame call site : steps
 * `weather` — the rain ramp, the settled snow, the wet stone and puddles,
 * the trail decay — once a frame, before the consumers that read it
 * (`AmbientParticleSystem`, `FootprintSystem`, the terrain shader binder).
 *
 * Stepped unconditionally, not from a particle slot: the snow accumulator
 * reads the squall schedule itself because the emitter stops when the hero
 * steps indoors and the snow outside does not, and wetness keeps building
 * from the packet ramp while the hero shelters.
 */
export const WeatherSystem: ISystemFactory = world => ({
  update: dt => {
    weather.update(world.mapIndex, dt);
  },
});
