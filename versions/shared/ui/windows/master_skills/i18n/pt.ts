/** Portuguese text of the `master_skills` window. */

import type en from './en';

export default {
  'master.spendPoint': 'Gastar {points} ponto de master em {skill}?',
  'master.spendPoints': 'Gastar {points} pontos de master em {skill}?',
  'master.skillFallback': 'habilidade {number}',
} satisfies Partial<Record<keyof typeof en, string>>;
