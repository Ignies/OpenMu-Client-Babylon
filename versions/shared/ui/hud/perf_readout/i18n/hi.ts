/** hi text of `versions/shared/ui/hud/perf_readout`. */

import type en from './en';

export default {
  'perf.fps': 'FPS',
  'perf.frame': 'फ़्रेम',
  'perf.ping': 'पिंग',
} satisfies Partial<Record<keyof typeof en, string>>;
