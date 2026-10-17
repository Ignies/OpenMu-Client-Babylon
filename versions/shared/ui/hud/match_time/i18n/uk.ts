/** uk text of `versions/shared/ui/hud/match_time`. */

import type en from './en';

export default {
  'matchTime.padded': 'Залишилося: {min}:0{sec}',
  'matchTime.plain': 'Залишилося: {min}:{sec}',
} satisfies Partial<Record<keyof typeof en, string>>;
