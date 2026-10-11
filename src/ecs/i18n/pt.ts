/** Portuguese text of the ECS systems (`src/ecs`). */

import type en from './en';

export default {
  'instrument.needStanding': 'Fique parado para pegar um instrumento',
  'notify.arrowsReloaded': 'Flechas recarregadas',
  'notify.noMoreArrows': 'Não há mais flechas',
} satisfies Partial<Record<keyof typeof en, string>>;
