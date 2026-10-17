/** eu text of `src/modules/session`. */

import type en from './en';

export default {
  'exit.chaosOpen': 'Itxi Chaos Machine leihoa jokotik irten aurretik.',
  'exit.noAnswer': 'Zerbitzariak ez du erantzun. Hala ere irteten.',
  'resume.done': 'Berriro linean',
  'resume.failed': 'Ezin izan da birkonektatu',
  'resume.cancelled': 'Birkonexioa bertan behera utzi da',
} satisfies Partial<Record<keyof typeof en, string>>;
