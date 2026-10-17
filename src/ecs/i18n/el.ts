/** el text of `src/ecs`. */

import type en from './en';

export default {
  'instrument.needStanding': 'Σταματήστε να κινείστε για να βγάλετε όργανο',
  'notify.arrowsReloaded': 'Τα βέλη ξαναγέμισαν',
  'notify.noMoreArrows': 'Τελείωσαν τα βέλη',
} satisfies Partial<Record<keyof typeof en, string>>;
