/** German text of the ECS systems (`src/ecs`). */

import type en from './en';

export default {
  'instrument.needStanding': 'Steh still, um ein Instrument herauszuholen',
  'notify.arrowsReloaded': 'Pfeile nachgeladen',
  'notify.noMoreArrows': 'Keine Pfeile mehr',
} satisfies Partial<Record<keyof typeof en, string>>;
