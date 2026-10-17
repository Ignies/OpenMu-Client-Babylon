/** hu text of `src/modules/drops`. */

import type en from './en';

export default {
  'notify.cannotDropItem': 'Ez a tárgy nem dobható el',
  'notify.carryingTooMuchZen': 'Túl sok Zen van nálad',
  'notify.cannotPickUp': 'Ezt nem veheted fel',
} satisfies Partial<Record<keyof typeof en, string>>;
