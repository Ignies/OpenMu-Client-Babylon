/** hi text of `versions/shared/ui/hud/match_time`. */

import type en from './en';

export default {
  'matchTime.padded': 'बचा समय {min}:0{sec}',
  'matchTime.plain': 'बचा समय {min}:{sec}',
} satisfies Partial<Record<keyof typeof en, string>>;
