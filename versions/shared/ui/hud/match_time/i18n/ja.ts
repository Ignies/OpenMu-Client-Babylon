/** Japanese text of the `match_time` HUD element. */

import type en from './en';

export default {
  'matchTime.padded': '残り時間 {min}:0{sec}',
  'matchTime.plain': '残り時間 {min}:{sec}',
} satisfies Partial<Record<keyof typeof en, string>>;
