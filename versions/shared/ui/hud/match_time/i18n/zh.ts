/** Chinese text of the `match_time` HUD element. */

import type en from './en';

export default {
  'matchTime.padded': '剩余时间 {min}:0{sec}',
  'matchTime.plain': '剩余时间 {min}:{sec}',
} satisfies Partial<Record<keyof typeof en, string>>;
