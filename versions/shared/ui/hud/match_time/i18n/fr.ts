/** French text of the `match_time` HUD element. */

import type en from './en';

export default {
  'matchTime.padded': 'Temps restant {min}:0{sec}',
  'matchTime.plain': 'Temps restant {min}:{sec}',
} satisfies Partial<Record<keyof typeof en, string>>;
