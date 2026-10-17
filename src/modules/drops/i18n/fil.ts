/** fil text of `src/modules/drops`. */

import type en from './en';

export default {
  'notify.cannotDropItem': 'Hindi maihuhulog ang item na iyan',
  'notify.carryingTooMuchZen': 'Sobra ang dala mong zen',
  'notify.cannotPickUp': 'Hindi iyan mapupulot',
  'drop.skill': '+Skill',
  'drop.option': '+Opsyon',
  'drop.luck': '+Luck',
  'drop.knightSkill': 'Skill para sa Knight',
} satisfies Partial<Record<keyof typeof en, string>>;
