/** Spanish text of the `match_time` HUD element. */

import type en from './en';

export default {
  'matchTime.padded': 'Tiempo restante {min}:0{sec}',
  'matchTime.plain': 'Tiempo restante {min}:{sec}',
} satisfies Partial<Record<keyof typeof en, string>>;
