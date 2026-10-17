/** el text of `versions/shared/ui/hud/match_time`. */

import type en from './en';

export default {
  'matchTime.padded': 'Υπόλοιπος χρόνος {min}:0{sec}',
  'matchTime.plain': 'Υπόλοιπος χρόνος {min}:{sec}',
} satisfies Partial<Record<keyof typeof en, string>>;
