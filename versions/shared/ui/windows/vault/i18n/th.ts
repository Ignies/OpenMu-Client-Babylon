/** Thai text of the `vault` window. */

import type en from './en';

export default {
  'vault.depositJewels': 'อัญมณี',
  'vault.depositJewelsHint': 'ย้ายอัญมณีทั้งหมดจากกระเป๋าไปที่คลัง',

  'vault.title': 'คลัง',
  'vault.unlocked': 'ปลดล็อกแล้ว',
  'vault.locked': 'ล็อกอยู่',
  'vault.fee': 'ค่าธรรมเนียม',
  'vault.deposit': 'ฝากเซน',
  'vault.withdraw': 'ถอนเซน',
  'vault.pin': 'รหัสคลัง',
} satisfies Partial<Record<keyof typeof en, string>>;
