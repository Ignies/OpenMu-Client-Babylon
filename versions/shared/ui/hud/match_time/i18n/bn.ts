/** bn text of `versions/shared/ui/hud/match_time`. */

import type en from './en';

export default {
  'matchTime.padded': 'বাকি সময় {min}:0{sec}',
  'matchTime.plain': 'বাকি সময় {min}:{sec}',
} satisfies Partial<Record<keyof typeof en, string>>;
