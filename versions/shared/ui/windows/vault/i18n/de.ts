/** German text of the `vault` window. */

import type en from './en';

export default {
  'vault.depositJewels': 'Juwelen',
  'vault.depositJewelsHint': 'Alle Juwelen aus dem Inventar ins Lager legen',

  'vault.title': 'Lager',
  'vault.unlocked': 'Entsperrt',
  'vault.locked': 'Gesperrt',
  'vault.fee': 'Gebühr',
  'vault.deposit': 'Zen einlagern',
  'vault.withdraw': 'Zen abheben',
  'vault.pin': 'Lager-PIN',
} satisfies Partial<Record<keyof typeof en, string>>;
