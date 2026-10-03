/** Chinese text of the `master_skills` window. */

import type en from './en';

export default {
  'master.spendPoint': '要花费 {points} 点大师点数学习{skill}吗？',
  'master.spendPoints': '要花费 {points} 点大师点数学习{skill}吗？',
  'master.skillFallback': '技能 {number}',
} satisfies Partial<Record<keyof typeof en, string>>;
