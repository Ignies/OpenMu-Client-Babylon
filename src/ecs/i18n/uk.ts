/** uk text of `src/ecs`. */

import type en from './en';

export default {
  'instrument.needStanding': 'Стійте на місці, щоб дістати інструмент',
  'notify.arrowsReloaded': 'Стріли перезаряджено',
  'notify.noMoreArrows': 'Стріли закінчилися',
} satisfies Partial<Record<keyof typeof en, string>>;
