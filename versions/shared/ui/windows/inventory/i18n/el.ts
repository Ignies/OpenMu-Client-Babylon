/** el text of `versions/shared/ui/windows/inventory`. */

import type en from './en';

export default {
  'inventory.title': 'Σακίδιο',
  'inventory.close': 'Κλείσιμο (I,V)',
  'inventory.repair': 'Επισκευή (L)',
  'inventory.personalShop': 'Προσωπικό κατάστημα',
  'inventory.expand': 'Άνοιγμα επέκτασης σακιδίου (K)',
} satisfies Partial<Record<keyof typeof en, string>>;
