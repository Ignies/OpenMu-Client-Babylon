/** Bulgarian text of the `master_skills` window. */

import type en from './en';

export default {
  'master.spendPoint': 'Да похарчиш ли {points} master точка за {skill}?',
  'master.spendPoints': 'Да похарчиш ли {points} master точки за {skill}?',
  'master.skillFallback': 'умение {number}',
} satisfies Partial<Record<keyof typeof en, string>>;
