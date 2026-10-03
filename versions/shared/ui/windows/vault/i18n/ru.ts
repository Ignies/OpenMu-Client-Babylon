/** Russian text of the `vault` window. */

import type en from './en';

export default {
  'vault.depositJewels': 'Камни',
  'vault.depositJewelsHint': 'Переместить все камни из инвентаря в хранилище',

  'vault.title': 'Хранилище',
  'vault.unlocked': 'Открыто',
  'vault.locked': 'Заперто',
  'vault.fee': 'Плата',
  'vault.deposit': 'Положить Zen',
  'vault.withdraw': 'Забрать Zen',
  'vault.pin': 'PIN хранилища',
} satisfies Partial<Record<keyof typeof en, string>>;
