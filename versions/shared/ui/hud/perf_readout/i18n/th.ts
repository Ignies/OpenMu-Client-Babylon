/** Thai text of the `perf_readout` HUD element. */

import type en from './en';

export default {
  'perf.fps': 'FPS',
  'perf.frame': 'เฟรม',
  'perf.ping': 'Ping',
} satisfies Partial<Record<keyof typeof en, string>>;
