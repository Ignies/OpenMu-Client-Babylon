/** zh-Hant text of `src/ecs`. */

import type en from './en';

export default {
  'instrument.needStanding': '站定後才能拿出樂器',
  'notify.arrowsReloaded': '箭矢已裝填',
  'notify.noMoreArrows': '箭矢已用完',
} satisfies Partial<Record<keyof typeof en, string>>;
