/** English text of the `events` window. See src/i18n/readme.md. */

const en = {
  'goldenArcher.title': 'Golden Archer',
  'goldenArcher.intro1': 'Bring me your Rena',
  'goldenArcher.intro2': 'and I will register it.',
  'goldenArcher.intro3': 'Rewards await the diligent.',
  'goldenArcher.renaLabel': 'Rena in inventory',
  'goldenArcher.registeredLabel': 'Registered Rena',
  'goldenArcher.register': 'Register',
};

export default en;

declare module '@/i18n' {
  interface TextOwners {
    'versions/shared/ui/windows/events': typeof en;
  }
}
