/** tr text of `versions/shared/ui/windows/master_skills`. */

import type en from './en';

export default {
  'master.spendPoint': '{skill} için {points} Master puanı harcansın mı?',
  'master.spendPoints': '{skill} için {points} Master puanı harcansın mı?',
  'master.skillFallback': 'yetenek {number}',
} satisfies Partial<Record<keyof typeof en, string>>;
