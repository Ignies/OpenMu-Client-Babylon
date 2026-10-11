/** Chinese text of the `drops` module. */

import type en from './en';

export default {
  'notify.cannotDropItem': '这件物品无法丢弃',
  'notify.carryingTooMuchZen': '你携带的金币太多了',
  'notify.cannotPickUp': '无法拾取该物品',
  'drop.skill': '+技能',
  'drop.option': '+附加',
  'drop.luck': '+幸运',
  'drop.knightSkill': '骑士专用技能',
} satisfies Partial<Record<keyof typeof en, string>>;
