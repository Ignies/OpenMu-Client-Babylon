/** el text of `versions/shared/ui/windows/master_skills`. */

import type en from './en';

export default {
  'master.spendPoint': 'Χρήση πόντων Master ({points}) για: {skill};',
  'master.spendPoints': 'Χρήση πόντων Master ({points}) για: {skill};',
  'master.skillFallback': 'δεξιότητα {number}',
} satisfies Partial<Record<keyof typeof en, string>>;
