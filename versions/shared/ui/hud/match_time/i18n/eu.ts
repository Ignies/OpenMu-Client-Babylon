/** eu text of `versions/shared/ui/hud/match_time`. */

import type en from './en';

export default {
  'matchTime.padded': 'Geratzen den denbora {min}:0{sec}',
  'matchTime.plain': 'Geratzen den denbora {min}:{sec}',
} satisfies Partial<Record<keyof typeof en, string>>;
