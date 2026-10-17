/** fa text of `versions/shared/ui/hud/match_time`. */

import type en from './en';

export default {
  'matchTime.padded': 'ساعت باقی‌مانده {min}:0{sec}',
  'matchTime.plain': 'ثانیه باقی‌مانده {min}:{sec}',
} satisfies Partial<Record<keyof typeof en, string>>;
