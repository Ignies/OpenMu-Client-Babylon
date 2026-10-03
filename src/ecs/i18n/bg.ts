/** Bulgarian text of the ECS systems (`src/ecs`). */

import type en from './en';

export default {
  'instrument.needStanding': 'Стой на място, за да извадиш инструмент',
  'notify.arrowsReloaded': 'Стрелите са презаредени',
  'notify.noMoreArrows': 'Няма повече стрели',
} satisfies Partial<Record<keyof typeof en, string>>;
