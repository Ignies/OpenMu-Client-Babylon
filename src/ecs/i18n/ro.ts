/** Romanian text of the ECS systems (`src/ecs`). */

import type en from './en';

export default {
  'instrument.needStanding': 'Stai pe loc ca să scoți un instrument',
  'notify.arrowsReloaded': 'Săgeți reîncărcate',
  'notify.noMoreArrows': 'Nu mai ai săgeți',
} satisfies Partial<Record<keyof typeof en, string>>;
