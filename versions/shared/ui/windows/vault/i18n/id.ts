/** id text of `versions/shared/ui/windows/vault`. */

import type en from './en';

export default {
  'vault.depositJewels': 'Permata',
  'vault.depositJewelsHint': 'Pindahkan semua permata dari inventaris ke gudang',
  'vault.title': 'Gudang',
  'vault.unlocked': 'Tidak terkunci',
  'vault.locked': 'Terkunci',
  'vault.fee': 'Biaya',
  'vault.deposit': 'Simpan Zen',
  'vault.withdraw': 'Ambil Zen',
  'vault.pin': 'PIN gudang',
} satisfies Partial<Record<keyof typeof en, string>>;
