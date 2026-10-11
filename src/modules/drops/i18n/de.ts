/** German text of the `drops` module. */

import type en from './en';

export default {
  'notify.cannotDropItem': 'Diesen Gegenstand kannst du nicht ablegen',
  'notify.carryingTooMuchZen': 'Du trägst zu viel Zen',
  'notify.cannotPickUp': 'Das kannst du nicht aufheben',
  'drop.skill': '+Fertigkeit',
  'drop.option': '+Option',
  'drop.luck': '+Glück',
  'drop.knightSkill': 'Ritterfertigkeit',
} satisfies Partial<Record<keyof typeof en, string>>;
