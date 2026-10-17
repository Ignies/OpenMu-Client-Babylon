/** ur text of `versions/shared/ui/windows/master_skills`. */

import type en from './en';

export default {
  'master.spendPoint': 'سکل {skill} پر {points} ماسٹر پوائنٹ خرچ کریں؟',
  'master.spendPoints': 'سکل {skill} پر {points} ماسٹر پوائنٹس خرچ کریں؟',
  'master.skillFallback': 'سکل {number}',
} satisfies Partial<Record<keyof typeof en, string>>;
