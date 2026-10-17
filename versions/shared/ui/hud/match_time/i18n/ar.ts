/** ar text of `versions/shared/ui/hud/match_time`. */

import type en from './en';

export default {
  'matchTime.padded': 'الوقت المتبقي {min}:0{sec}',
  'matchTime.plain': 'الوقت المتبقي {min}:{sec}',
} satisfies Partial<Record<keyof typeof en, string>>;
