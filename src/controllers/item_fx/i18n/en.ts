/** English text of the `item_fx` controller. See src/i18n/readme.md. */

const en = {
  'options.itemEffects.legacy': 'Legacy',
  'options.itemEffects.both': 'Both',
  'options.itemEffects.improved': 'Improved',
};

export default en;

declare module '@/i18n' {
  interface TextOwners {
    'src/controllers/item_fx': typeof en;
  }
}
