/** id text of `versions/shared/ui/hud/match_time`. */

import type en from './en';

export default {
  'matchTime.padded': 'Sisa waktu {min}:0{sec}',
  'matchTime.plain': 'Sisa waktu {min}:{sec}',
} satisfies Partial<Record<keyof typeof en, string>>;
