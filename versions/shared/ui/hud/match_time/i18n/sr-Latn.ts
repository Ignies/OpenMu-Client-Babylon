/** sr-Latn text of `versions/shared/ui/hud/match_time`. */

import type en from './en';

export default {
  'matchTime.padded': 'Preostalo vreme {min}:0{sec}',
  'matchTime.plain': 'Preostalo vreme {min}:{sec}',
} satisfies Partial<Record<keyof typeof en, string>>;
