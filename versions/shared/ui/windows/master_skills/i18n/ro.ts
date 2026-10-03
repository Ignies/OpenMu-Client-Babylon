/** Romanian text of the `master_skills` window. */

import type en from './en';

export default {
  'master.spendPoint': 'Cheltuiești {points} punct de master pe {skill}?',
  'master.spendPoints': 'Cheltuiești {points} puncte de master pe {skill}?',
  'master.skillFallback': 'abilitatea {number}',
} satisfies Partial<Record<keyof typeof en, string>>;
