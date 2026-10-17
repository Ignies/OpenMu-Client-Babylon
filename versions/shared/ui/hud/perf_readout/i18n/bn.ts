/** bn text of `versions/shared/ui/hud/perf_readout`. */

import type en from './en';

export default {
  'perf.fps': 'FPS',
  'perf.frame': 'ফ্রেম',
  'perf.ping': 'পিং',
} satisfies Partial<Record<keyof typeof en, string>>;
