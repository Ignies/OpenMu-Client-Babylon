/** eu text of `versions/shared/ui/windows/master_skills`. */

import type en from './en';

export default {
  'master.spendPoint': 'Erabili {points} maisu-puntu hemen: {skill}?',
  'master.spendPoints': 'Erabili {points} maisu-puntu hemen: {skill}?',
  'master.skillFallback': '{number}. trebetasuna',
} satisfies Partial<Record<keyof typeof en, string>>;
