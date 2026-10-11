/** Japanese text of the `vault` window. */

import type en from './en';

export default {
  'vault.depositJewels': '宝石',
  'vault.depositJewelsHint': '所持品の宝石をすべて倉庫へ移す',

  'vault.title': '倉庫',
  'vault.unlocked': 'ロック解除',
  'vault.locked': 'ロック中',
  'vault.fee': '手数料',
  'vault.deposit': 'Zen を預ける',
  'vault.withdraw': 'Zen を引き出す',
  'vault.pin': '倉庫の暗証番号',
} satisfies Partial<Record<keyof typeof en, string>>;
