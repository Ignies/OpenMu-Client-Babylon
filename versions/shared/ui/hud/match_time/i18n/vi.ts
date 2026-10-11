/** Vietnamese text of the `match_time` HUD element. */

import type en from './en';

export default {
  'matchTime.padded': 'Thời gian còn lại {min}:0{sec}',
  'matchTime.plain': 'Thời gian còn lại {min}:{sec}',
} satisfies Partial<Record<keyof typeof en, string>>;
