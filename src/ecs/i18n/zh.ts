/** Chinese text of the ECS systems (`src/ecs`). */

import type en from './en';

export default {
  'instrument.needStanding': '站定后才能取出乐器',
  'notify.arrowsReloaded': '已装填箭矢',
  'notify.noMoreArrows': '没有箭矢了',
} satisfies Partial<Record<keyof typeof en, string>>;
