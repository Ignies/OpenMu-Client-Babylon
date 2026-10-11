/** Korean text of the `match_time` HUD element. */

import type en from './en';

export default {
  'matchTime.padded': '남은 시간 {min}:0{sec}',
  'matchTime.plain': '남은 시간 {min}:{sec}',
} satisfies Partial<Record<keyof typeof en, string>>;
