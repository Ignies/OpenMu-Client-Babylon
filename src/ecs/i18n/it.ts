/** Italian text of the ECS systems (`src/ecs`). */

import type en from './en';

export default {
  'instrument.needStanding': 'Stai fermo per tirare fuori uno strumento',
  'notify.arrowsReloaded': 'Frecce ricaricate',
  'notify.noMoreArrows': 'Frecce esaurite',
} satisfies Partial<Record<keyof typeof en, string>>;
