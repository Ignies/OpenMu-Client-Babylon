/** English text of the `personal_shop` module. See src/i18n/readme.md. */

const en = {
  'personalShop.disabled': 'Personal shops are switched off on this server.',
  'personalShop.slotNotInShop': 'That slot is not part of the shop.',
  'personalShop.priceNotSet': 'The price could not be set.',
};

export default en;

declare module '@/i18n' {
  interface TextOwners {
    'src/modules/personal_shop': typeof en;
  }
}
