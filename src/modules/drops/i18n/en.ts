/** English text of the `drops` module. See src/i18n/readme.md. */

const en = {
  'notify.cannotDropItem': "Can't drop that item",
  'notify.carryingTooMuchZen': 'You are carrying too much zen',
  'notify.cannotPickUp': "Can't pick that up",
};

export default en;

declare module '@/i18n' {
  interface TextOwners {
    'src/modules/drops': typeof en;
  }
}
