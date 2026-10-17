/** cs text of `versions/shared/ui/windows/master_skills`. */

import type en from './en';

export default {
  'master.spendPoint': 'Utratit mistrovské body ({points}) za: {skill}?',
  'master.spendPoints': 'Utratit mistrovské body ({points}) za: {skill}?',
  'master.skillFallback': 'dovednost {number}',
} satisfies Partial<Record<keyof typeof en, string>>;
