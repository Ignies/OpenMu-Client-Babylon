/** Chinese text of the `vault` window. */

import type en from './en';

export default {
  'vault.depositJewels': '宝石',
  'vault.depositJewelsHint': '把背包里的所有宝石放入仓库',

  'vault.title': '仓库',
  'vault.unlocked': '已解锁',
  'vault.locked': '已锁定',
  'vault.fee': '费用',
  'vault.deposit': '存入金币',
  'vault.withdraw': '取出金币',
  'vault.pin': '仓库密码',
} satisfies Partial<Record<keyof typeof en, string>>;
