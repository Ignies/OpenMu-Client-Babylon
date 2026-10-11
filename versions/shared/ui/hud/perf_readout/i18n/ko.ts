/** Korean text of the `perf_readout` HUD element. */

import type en from './en';

export default {
  'perf.fps': 'FPS',
  'perf.frame': '프레임',
  'perf.ping': '핑',
} satisfies Partial<Record<keyof typeof en, string>>;
