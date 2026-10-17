/** zh-Hant text of `versions/shared/ui/windows/master_skills`. */

import type en from './en';

export default {
  'master.spendPoint': '要花費{points}大師點數在{skill}上嗎？',
  'master.spendPoints': '要花費{points}大師點數在{skill}上嗎？',
  'master.skillFallback': '技能{number}',
} satisfies Partial<Record<keyof typeof en, string>>;
