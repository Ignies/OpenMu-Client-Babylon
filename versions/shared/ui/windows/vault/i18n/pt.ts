/** Portuguese text of the `vault` window. */

import type en from './en';

export default {
  'vault.depositJewels': 'Joias',
  'vault.depositJewelsHint': 'Mover todas as joias do inventário para o baú',

  'vault.title': 'Baú',
  'vault.unlocked': 'Destrancado',
  'vault.locked': 'Trancado',
  'vault.fee': 'Taxa',
  'vault.deposit': 'Guardar Zen',
  'vault.withdraw': 'Retirar Zen',
  'vault.pin': 'PIN do baú',
} satisfies Partial<Record<keyof typeof en, string>>;
