/** cs text of `src/ecs`. */

import type en from './en';

export default {
  'instrument.needStanding': 'Pro vytažení nástroje stůj na místě',
  'notify.arrowsReloaded': 'Šípy doplněny',
  'notify.noMoreArrows': 'Došly šípy',
} satisfies Partial<Record<keyof typeof en, string>>;
