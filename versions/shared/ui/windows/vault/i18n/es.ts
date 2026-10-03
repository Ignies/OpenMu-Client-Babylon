/** Spanish text of the `vault` window. */

import type en from './en';

export default {
  'vault.depositJewels': 'Joyas',
  'vault.depositJewelsHint': 'Mover todas las joyas del inventario al almacén',

  'vault.title': 'Bóveda',
  'vault.unlocked': 'Abierta',
  'vault.locked': 'Bloqueada',
  'vault.fee': 'Tarifa',
  'vault.deposit': 'Guardar Zen',
  'vault.withdraw': 'Retirar Zen',
  'vault.pin': 'PIN de la bóveda',
} satisfies Partial<Record<keyof typeof en, string>>;
