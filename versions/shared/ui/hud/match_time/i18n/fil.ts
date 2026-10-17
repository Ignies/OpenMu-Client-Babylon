/** fil text of `versions/shared/ui/hud/match_time`. */

import type en from './en';

export default {
  'matchTime.padded': 'Natitirang oras {min}:0{sec}',
  'matchTime.plain': 'Natitirang segundo {min}:{sec}',
} satisfies Partial<Record<keyof typeof en, string>>;
