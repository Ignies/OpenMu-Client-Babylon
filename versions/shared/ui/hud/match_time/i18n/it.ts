/** Italian text of the `match_time` HUD element. */

import type en from './en';

export default {
  'matchTime.padded': 'Tempo rimanente {min}:0{sec}',
  'matchTime.plain': 'Tempo rimanente {min}:{sec}',
} satisfies Partial<Record<keyof typeof en, string>>;
