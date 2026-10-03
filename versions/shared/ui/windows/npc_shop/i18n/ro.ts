/** Romanian text of the `npc_shop` window. */

import type en from './en';

export default {
  'shop.title': 'Magazin',
  'shop.repairAll': 'Repară tot',
  'shop.repair': 'Repară',
  'shop.tax': 'Taxă de vânzare: {rate}%',
} satisfies Partial<Record<keyof typeof en, string>>;
