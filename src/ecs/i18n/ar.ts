/** ar text of `src/ecs`. */

import type en from './en';

export default {
  'instrument.needStanding': 'قف ثابتا لإخراج آلة موسيقية',
  'notify.arrowsReloaded': 'تمت إعادة تذخير السهام',
  'notify.noMoreArrows': 'نفدت السهام',
} satisfies Partial<Record<keyof typeof en, string>>;
