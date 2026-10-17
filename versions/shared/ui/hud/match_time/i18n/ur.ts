/** ur text of `versions/shared/ui/hud/match_time`. */

import type en from './en';

export default {
  'matchTime.padded': 'باقی وقت {min}:0{sec}',
  'matchTime.plain': 'باقی وقت {min}:{sec}',
} satisfies Partial<Record<keyof typeof en, string>>;
