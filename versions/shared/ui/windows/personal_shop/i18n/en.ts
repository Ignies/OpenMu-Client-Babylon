/** English text of the `personal_shop` window. See src/i18n/readme.md. */

const en = {
  'personalShop.title': 'Personal Shop',
  'personalShop.button': 'Shop',
  'personalShop.selling': 'Your shop is open for business',
  'personalShop.namePlaceholder': 'Shop name',
  'personalShop.openTip': 'Open the shop',
  'personalShop.closeTip': 'Take the shop down',
  'personalShop.info1': 'Set a price on every item before opening.',
  'personalShop.info2': 'The shop closes when you move or log out.',
  'personalShop.info3': 'Buyers need to stand next to you.',
  'personalShop.info4': 'Priced items cannot be used or dropped.',
  'personalShop.info5': 'Zen is paid straight into your inventory.',
  'personalShop.warn1': 'Never sell for less than an item is worth.',
  'personalShop.warn2': 'The server keeps the final word on prices.',
};

export default en;

declare module '@/i18n' {
  interface TextOwners {
    'versions/shared/ui/windows/personal_shop': typeof en;
  }
}
