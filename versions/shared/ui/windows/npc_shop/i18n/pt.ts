/** Portuguese text of the `npc_shop` window. */

import type en from './en';

export default {
  'shop.title': 'Loja',
  'shop.repairAll': 'Reparar tudo',
  'shop.repair': 'Reparar',
  'shop.tax': 'Imposto de venda: {rate}%',
} satisfies Partial<Record<keyof typeof en, string>>;
