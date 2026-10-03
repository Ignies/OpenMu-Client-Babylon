/** Italian text of the `inventory` window. */

import type en from './en';

export default {
  'inventory.title': 'Inventario',
  'inventory.close': 'Chiudi (I,V)',
  'inventory.repair': 'Ripara (L)',
  'inventory.personalShop': 'Negozio personale',
  'inventory.expand': 'Apri l’inventario esteso (K)',
} satisfies Partial<Record<keyof typeof en, string>>;
