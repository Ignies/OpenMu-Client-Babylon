import type { WeatherLayer } from './layer';
import { rainLayer } from './rainState';
import { snowCoverLayer } from './snowCover';
import { wetnessLayer } from './wetness';
import { footprintsLayer } from './footprints';
import { snowSprayLayer } from './snowSpray';
import { snowCapsLayer } from './snowCaps';
import { snowTrailLayer } from './snowTrail';
import { snowSinkLayer } from './snowSink';
import { snowMeltLayer } from './snowMelt';
import { puddleUnderfootLayer } from './puddleUnderfoot';

/**
 * THE list. Every weather effect in the game is one entry here, and adding an
 * effect is adding one line. Nothing else in the codebase enumerates them.
 *
 * Order is update order and it matters: an effect that reads another must
 * come after it. Today that is only wetness → rain.
 */
export const WEATHER_LAYERS: readonly WeatherLayer[] = [
  rainLayer,
  snowCoverLayer, // reads the squall schedule, not rain — order-free
  wetnessLayer, // reads rainLayer
  footprintsLayer, // reset only; laid down by FootprintSystem
  snowSprayLayer, // reset only; fired by FootprintSystem
  snowCapsLayer, // reads snowCoverLayer; bound by the item material
  snowTrailLayer, // ploughed by FootprintSystem; sampled by the terrain shader
  snowMeltLayer, // patched by the fire skills; read by snowSinkLayer below and the shader
  snowSinkLayer, // reads snowCoverLayer + the overlay bed table + snowMeltLayer; asked by renderSystem
  puddleUnderfootLayer, // reads wetnessLayer; asked by FootprintSystem
];
