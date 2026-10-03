/** Spanish text of the ECS systems (`src/ecs`). */

import type en from './en';

export default {
  'instrument.needStanding': 'Quédate quieto para sacar un instrumento',
  'notify.arrowsReloaded': 'Flechas recargadas',
  'notify.noMoreArrows': 'No quedan flechas',
} satisfies Partial<Record<keyof typeof en, string>>;
