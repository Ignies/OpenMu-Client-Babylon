/** id text of `versions/shared/ui/windows/master_skills`. */

import type en from './en';

export default {
  'master.spendPoint': 'Pakai {points} poin Master untuk {skill}?',
  'master.spendPoints': 'Pakai {points} poin Master untuk {skill}?',
  'master.skillFallback': 'skill {number}',
} satisfies Partial<Record<keyof typeof en, string>>;
