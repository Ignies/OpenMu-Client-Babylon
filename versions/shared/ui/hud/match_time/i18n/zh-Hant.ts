/** zh-Hant text of `versions/shared/ui/hud/match_time`. */

import type en from './en';

export default {
  'matchTime.padded': '剩餘時間 {min}:0{sec}',
  'matchTime.plain': '剩餘時間 {min}:{sec}',
} satisfies Partial<Record<keyof typeof en, string>>;
