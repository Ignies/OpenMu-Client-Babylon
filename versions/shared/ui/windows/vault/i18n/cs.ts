/** cs text of `versions/shared/ui/windows/vault`. */

import type en from './en';

export default {
  'vault.depositJewels': 'Klenoty',
  'vault.depositJewelsHint': 'Přesunout všechny klenoty z inventáře do skladu',
  'vault.title': 'Sklad',
  'vault.unlocked': 'Odemčeno',
  'vault.locked': 'Zamčeno',
  'vault.fee': 'Poplatek',
  'vault.deposit': 'Uložit Zen',
  'vault.withdraw': 'Vybrat Zen',
  'vault.pin': 'PIN skladu',
} satisfies Partial<Record<keyof typeof en, string>>;
