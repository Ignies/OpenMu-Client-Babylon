/** Romanian text of the `match_time` HUD element. */

import type en from './en';

export default {
  'matchTime.padded': 'Timp rămas {min}:0{sec}',
  'matchTime.plain': 'Timp rămas {min}:{sec}',
} satisfies Partial<Record<keyof typeof en, string>>;
