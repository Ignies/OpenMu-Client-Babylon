/** Japanese text of the `drops` module. */

import type en from './en';

export default {
  'notify.cannotDropItem': 'そのアイテムは捨てられません',
  'notify.carryingTooMuchZen': '所持している Zen が多すぎます',
  'notify.cannotPickUp': 'それは拾えません',
  'drop.skill': '+スキル',
  'drop.option': '+オプション',
  'drop.luck': '+幸運',
  'drop.knightSkill': 'ナイト専用スキル',
} satisfies Partial<Record<keyof typeof en, string>>;
