/** Chinese text of the `perf_readout` HUD element. */

import type en from './en';

export default {
  'perf.fps': 'FPS',
  'perf.frame': '帧',
  'perf.ping': '延迟',
} satisfies Partial<Record<keyof typeof en, string>>;
