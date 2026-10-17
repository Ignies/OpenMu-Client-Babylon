/** hi text of `versions/shared/ui/windows/master_skills`. */

import type en from './en';

export default {
  'master.spendPoint': '{skill} पर {points} मास्टर पॉइंट खर्च करें?',
  'master.spendPoints': '{skill} पर {points} मास्टर पॉइंट खर्च करें?',
  'master.skillFallback': 'स्किल {number}',
} satisfies Partial<Record<keyof typeof en, string>>;
