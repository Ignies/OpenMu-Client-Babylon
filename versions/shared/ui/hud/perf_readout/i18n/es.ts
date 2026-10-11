/** Spanish text of the `perf_readout` HUD element. */

import type en from './en';

export default {
  'perf.fps': 'FPS',
  'perf.frame': 'Cuadro',
  'perf.ping': 'Ping',
} satisfies Partial<Record<keyof typeof en, string>>;
