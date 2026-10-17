/** ca text of `versions/shared/ui/windows/master_skills`. */

import type en from './en';

export default {
  'master.spendPoint': 'Vols gastar {points} punt mestre en {skill}?',
  'master.spendPoints': 'Vols gastar {points} punts mestres en {skill}?',
  'master.skillFallback': 'habilitat {number}',
} satisfies Partial<Record<keyof typeof en, string>>;
