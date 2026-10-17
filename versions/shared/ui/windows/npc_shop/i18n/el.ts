/** el text of `versions/shared/ui/windows/npc_shop`. */

import type en from './en';

export default {
  'shop.title': 'Κατάστημα',
  'shop.repairAll': 'Επισκευή όλων',
  'shop.repair': 'Επισκευή',
  'shop.tax': 'Φόρος πωλήσεων: {rate}%',
} satisfies Partial<Record<keyof typeof en, string>>;
