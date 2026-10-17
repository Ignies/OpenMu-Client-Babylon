/** cs text of `src/modules/drops`. */

import type en from './en';

export default {
  'notify.cannotDropItem': 'Tento předmět nelze zahodit',
  'notify.carryingTooMuchZen': 'Máš u sebe příliš mnoho Zen',
  'notify.cannotPickUp': 'Tohle nelze sebrat',
} satisfies Partial<Record<keyof typeof en, string>>;
