/** eu text of `src/ecs`. */

import type en from './en';

export default {
  'instrument.needStanding': 'Egon geldi instrumentu bat ateratzeko',
  'notify.arrowsReloaded': 'Geziak berriro kargatu dira',
  'notify.noMoreArrows': 'Ez dago gezi gehiagorik',
} satisfies Partial<Record<keyof typeof en, string>>;
