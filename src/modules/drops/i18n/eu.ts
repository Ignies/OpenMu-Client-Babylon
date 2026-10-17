/** eu text of `src/modules/drops`. */

import type en from './en';

export default {
  'notify.cannotDropItem': 'Ezin da objektu hori bota',
  'notify.carryingTooMuchZen': 'Zen gehiegi daramazu',
  'notify.cannotPickUp': 'Ezin da hori jaso',
  'drop.skill': '+Trebetasuna',
  'drop.option': '+Aukera',
  'drop.luck': '+Luck',
  'drop.knightSkill': 'Zaldunaren trebetasun berezia',
} satisfies Partial<Record<keyof typeof en, string>>;
