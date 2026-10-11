/** Vietnamese text of the `master_skills` window. */

import type en from './en';

export default {
  'master.spendPoint': 'Dùng {points} điểm master cho {skill}?',
  'master.spendPoints': 'Dùng {points} điểm master cho {skill}?',
  'master.skillFallback': 'kỹ năng {number}',
} satisfies Partial<Record<keyof typeof en, string>>;
