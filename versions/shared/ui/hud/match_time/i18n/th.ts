/** Thai text of the `match_time` HUD element. */

import type en from './en';

export default {
  'matchTime.padded': 'เวลาที่เหลือ {min}:0{sec}',
  'matchTime.plain': 'เวลาที่เหลือ {min}:{sec}',
} satisfies Partial<Record<keyof typeof en, string>>;
