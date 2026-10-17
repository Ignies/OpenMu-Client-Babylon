/** uk text of `versions/shared/ui/windows/master_skills`. */

import type en from './en';

export default {
  'master.spendPoint': '{skill}: витратити очки майстра ({points})?',
  'master.spendPoints': '{skill}: витратити очки майстра ({points})?',
  'master.skillFallback': 'Навичка {number}',
} satisfies Partial<Record<keyof typeof en, string>>;
