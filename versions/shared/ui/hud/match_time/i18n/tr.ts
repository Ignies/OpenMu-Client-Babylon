/** tr text of `versions/shared/ui/hud/match_time`. */

import type en from './en';

export default {
  'matchTime.padded': 'Kalan süre {min}:0{sec}',
  'matchTime.plain': 'Kalan süre {min}:{sec}',
} satisfies Partial<Record<keyof typeof en, string>>;
