/** Japanese text of the ECS systems (`src/ecs`). */

import type en from './en';

export default {
  'instrument.needStanding': '楽器を出すには立ち止まってください',
  'notify.arrowsReloaded': '矢筒を代えました。',
  'notify.noMoreArrows': '矢がありません。',
} satisfies Partial<Record<keyof typeof en, string>>;
