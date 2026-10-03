/** English text of the `party` module. See src/i18n/readme.md. */

const en = {
  'party.joined': 'You have joined the party.',
};

export default en;

declare module '@/i18n' {
  interface TextOwners {
    'src/modules/party': typeof en;
  }
}
