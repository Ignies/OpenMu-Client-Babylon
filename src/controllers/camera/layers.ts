import type { CameraLayer } from './layer';
import { battleCastleLayer } from './battleCastle';
import { pkFieldLayer } from './pkField';
import { doppelgangerLayer } from './doppelganger';

/**
 * THE LIST - every map with a camera override, one line each. Maps not
 * listed here use the wheel-zoom distance levels in `recipes.ts`. The only
 * place camera overrides are enumerated.
 */
export const CAMERA_LAYERS: readonly CameraLayer[] = [
  battleCastleLayer,
  pkFieldLayer,
  doppelgangerLayer,
];
