/** Russian text of the `match_time` HUD element. */

import type en from './en';

export default {
  'matchTime.padded': 'Осталось времени {min}:0{sec}',
  'matchTime.plain': 'Осталось времени {min}:{sec}',
} satisfies Partial<Record<keyof typeof en, string>>;
