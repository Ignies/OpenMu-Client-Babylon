/** Bulgarian text of the `match_time` HUD element. */

import type en from './en';

export default {
  'matchTime.padded': 'Оставащо време {min}:0{sec}',
  'matchTime.plain': 'Оставащо време {min}:{sec}',
} satisfies Partial<Record<keyof typeof en, string>>;
