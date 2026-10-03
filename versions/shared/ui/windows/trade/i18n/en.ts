/** English text of the `trade` window. See src/i18n/readme.md. */

const en = {
  'trade.title': 'Trade',
  'trade.warnCheck': 'Check every item before you accept.',
  'trade.warnAlike': 'Items can look alike but differ.',
  'trade.warnCancel': 'A cancelled trade returns everything.',
  'trade.cancel': 'Cancel trade',
  'trade.offerZen': 'Offer Zen',
  'trade.accept': 'Accept trade',
};

export default en;

declare module '@/i18n' {
  interface TextOwners {
    'versions/shared/ui/windows/trade': typeof en;
  }
}
