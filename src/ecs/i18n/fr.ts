/** French text of the ECS systems (`src/ecs`). */

import type en from './en';

export default {
  'instrument.needStanding': 'Restez immobile pour sortir un instrument',
  'notify.arrowsReloaded': 'Flèches rechargées',
  'notify.noMoreArrows': 'Plus de flèches',
} satisfies Partial<Record<keyof typeof en, string>>;
