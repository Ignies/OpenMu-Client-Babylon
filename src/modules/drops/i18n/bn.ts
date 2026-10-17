/** bn text of `src/modules/drops`. */

import type en from './en';

export default {
  'notify.cannotDropItem': 'ওই আইটেম ফেলা যায় না',
  'notify.carryingTooMuchZen': 'আপনি অনেক বেশি Zen বহন করছেন',
  'notify.cannotPickUp': 'ওটা তোলা যায় না',
  'drop.skill': '+স্কিল',
  'drop.option': '+অপশন',
  'drop.luck': '+ভাগ্য',
  'drop.knightSkill': 'নাইটের নিজস্ব স্কিল',
} satisfies Partial<Record<keyof typeof en, string>>;
