/** Polish text of the `match_time` HUD element. */

import type en from './en';

export default {
  'matchTime.padded': 'Pozostały czas {min}:0{sec}',
  'matchTime.plain': 'Pozostały czas {min}:{sec}',
} satisfies Partial<Record<keyof typeof en, string>>;
