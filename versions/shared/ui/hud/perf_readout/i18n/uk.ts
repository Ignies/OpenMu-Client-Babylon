/** uk text of `versions/shared/ui/hud/perf_readout`. */

import type en from './en';

export default {
  'perf.fps': 'FPS',
  'perf.frame': 'Кадр',
  'perf.ping': 'Пінг',
} satisfies Partial<Record<keyof typeof en, string>>;
