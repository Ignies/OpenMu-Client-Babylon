/** Russian text of the `perf_readout` HUD element. */

import type en from './en';

export default {
  'perf.fps': 'FPS',
  'perf.frame': 'Кадр',
  'perf.ping': 'Пинг',
} satisfies Partial<Record<keyof typeof en, string>>;
