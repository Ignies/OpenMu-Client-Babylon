/** German text of the `match_time` HUD element. */

import type en from './en';

export default {
  'matchTime.padded': 'Verbleibende Zeit {min}:0{sec}',
  'matchTime.plain': 'Verbleibende Zeit {min}:{sec}',
} satisfies Partial<Record<keyof typeof en, string>>;
