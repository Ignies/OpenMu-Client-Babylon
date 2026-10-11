/** Thai text of the ECS systems (`src/ecs`). */

import type en from './en';

export default {
  'instrument.needStanding': 'ยืนนิ่ง ๆ เพื่อหยิบเครื่องดนตรี',
  'notify.arrowsReloaded': 'เติมลูกธนูแล้ว',
  'notify.noMoreArrows': 'ลูกธนูหมดแล้ว',
} satisfies Partial<Record<keyof typeof en, string>>;
