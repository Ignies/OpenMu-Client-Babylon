/** Polish text of the ECS systems (`src/ecs`). */

import type en from './en';

export default {
  'instrument.needStanding': 'Stój w miejscu, aby wyjąć instrument',
  'notify.arrowsReloaded': 'Strzały uzupełnione',
  'notify.noMoreArrows': 'Brak strzał',
} satisfies Partial<Record<keyof typeof en, string>>;
