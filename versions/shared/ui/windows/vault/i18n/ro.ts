/** Romanian text of the `vault` window. */

import type en from './en';

export default {
  'vault.depositJewels': 'Bijuterii',
  'vault.depositJewelsHint': 'Mută toate bijuteriile din inventar în depozit',

  'vault.title': 'Seif',
  'vault.unlocked': 'Deblocat',
  'vault.locked': 'Blocat',
  'vault.fee': 'Taxă',
  'vault.deposit': 'Depune Zen',
  'vault.withdraw': 'Retrage Zen',
  'vault.pin': 'PIN-ul seifului',
} satisfies Partial<Record<keyof typeof en, string>>;
