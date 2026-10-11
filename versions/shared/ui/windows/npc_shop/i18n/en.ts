/** English text of the `npc_shop` window. See src/i18n/readme.md. */

const en = {
  'shop.title': 'Shop',
  'shop.repairAll': 'Repair all',
  'shop.repair': 'Repair',
  'shop.tax': 'Sales tax: {rate}%',
};

export default en;

declare module '@/i18n' {
  interface TextOwners {
    'versions/shared/ui/windows/npc_shop': typeof en;
  }
}
