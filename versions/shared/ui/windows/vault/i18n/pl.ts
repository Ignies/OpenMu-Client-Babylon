/** Polish text of the `vault` window. */

import type en from './en';

export default {
  'vault.depositJewels': 'Klejnoty',
  'vault.depositJewelsHint': 'Przenieś wszystkie klejnoty z ekwipunku do magazynu',
  'vault.title': 'Magazyn',
  'vault.unlocked': 'Odblokowany',
  'vault.locked': 'Zablokowany',
  'vault.fee': 'Opłata',
  'vault.deposit': 'Wpłać Zen',
  'vault.withdraw': 'Wypłać Zen',
  'vault.pin': 'PIN magazynu',
} satisfies Partial<Record<keyof typeof en, string>>;
