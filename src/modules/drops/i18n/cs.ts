/** cs text of `src/modules/drops`. */

import type en from './en';

export default {
  'notify.cannotDropItem': 'Tento předmět nelze zahodit',
  'notify.carryingTooMuchZen': 'Máš u sebe příliš mnoho Zen',
  'notify.cannotPickUp': 'Tohle nelze sebrat',
  'drop.skill': '+Dovednost',
  'drop.option': '+Vlastnost',
  'drop.luck': '+Štěstí',
  'drop.knightSkill': 'Dovednost určená pro rytíře',
} satisfies Partial<Record<keyof typeof en, string>>;
