/** Italian text of the `master_skills` window. */

import type en from './en';

export default {
  'master.spendPoint': 'Spendere {points} punto master su {skill}?',
  'master.spendPoints': 'Spendere {points} punti master su {skill}?',
  'master.skillFallback': 'abilità {number}',
} satisfies Partial<Record<keyof typeof en, string>>;
