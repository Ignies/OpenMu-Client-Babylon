/** English text of the `trade` module. See src/i18n/readme.md. */

const en = {
  'trade.refused': 'The trade was refused.',
};

export default en;

declare module '@/i18n' {
  interface TextOwners {
    'src/modules/trade': typeof en;
  }
}
