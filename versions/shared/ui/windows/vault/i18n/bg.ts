/** Bulgarian text of the `vault` window. */

import type en from './en';

export default {
  'vault.depositJewels': 'Камъни',
  'vault.depositJewelsHint': 'Премести всички камъни от инвентара в склада',

  'vault.title': 'Трезор',
  'vault.unlocked': 'Отключен',
  'vault.locked': 'Заключен',
  'vault.fee': 'Такса',
  'vault.deposit': 'Внеси Zen',
  'vault.withdraw': 'Изтегли Zen',
  'vault.pin': 'ПИН на трезора',
} satisfies Partial<Record<keyof typeof en, string>>;
