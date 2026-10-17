/** cs text of `versions/shared/ui/hud/match_time`. */

import type en from './en';

export default {
  'matchTime.padded': 'Zbývající čas {min}:0{sec}',
  'matchTime.plain': 'Zbývající čas {min}:{sec}',
} satisfies Partial<Record<keyof typeof en, string>>;
