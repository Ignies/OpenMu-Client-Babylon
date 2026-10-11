/** French text of the `master_skills` window. */

import type en from './en';

export default {
  'master.spendPoint': 'Dépenser {points} point de master sur {skill} ?',
  'master.spendPoints': 'Dépenser {points} points de master sur {skill} ?',
  'master.skillFallback': 'compétence {number}',
} satisfies Partial<Record<keyof typeof en, string>>;
