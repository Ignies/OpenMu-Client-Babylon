/** zh-Hant text of `src/modules/drops`. */

import type en from './en';

export default {
  'notify.cannotDropItem': '無法丟棄該物品',
  'notify.carryingTooMuchZen': '你攜帶的金幣太多了',
  'notify.cannotPickUp': '無法撿取',
  'drop.skill': '+技能',
  'drop.option': '+追加',
  'drop.luck': '+幸運',
  'drop.knightSkill': '劍士專用技能',
} satisfies Partial<Record<keyof typeof en, string>>;
