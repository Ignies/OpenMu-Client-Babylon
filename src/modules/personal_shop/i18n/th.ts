/** Thai text of the `personal_shop` module. */

import type en from './en';

export default {
  'personalShop.disabled': 'เซิร์ฟเวอร์นี้ปิดร้านค้าส่วนตัวไว้',
  'personalShop.slotNotInShop': 'ช่องนั้นไม่ใช่ส่วนหนึ่งของร้าน',
  'personalShop.priceNotSet': 'ตั้งราคาไม่สำเร็จ',
} satisfies Partial<Record<keyof typeof en, string>>;
