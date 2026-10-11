/** Italian text of the `vault` window. */

import type en from './en';

export default {
  'vault.depositJewels': 'Gioielli',
  'vault.depositJewelsHint': 'Sposta tutti i gioielli dall’inventario al deposito',

  'vault.title': 'Deposito',
  'vault.unlocked': 'Sbloccato',
  'vault.locked': 'Bloccato',
  'vault.fee': 'Tassa',
  'vault.deposit': 'Deposita Zen',
  'vault.withdraw': 'Preleva Zen',
  'vault.pin': 'PIN del deposito',
} satisfies Partial<Record<keyof typeof en, string>>;
