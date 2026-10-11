/** Thai text of the `personal_shop` window. */

import type en from './en';

export default {
  'personalShop.title': 'ร้านค้าส่วนตัว',
  'personalShop.button': 'ร้านค้า',
  'personalShop.selling': 'ร้านของคุณเปิดขายอยู่',
  'personalShop.namePlaceholder': 'ชื่อร้าน',
  'personalShop.openTip': 'เปิดร้าน',
  'personalShop.closeTip': 'ปิดร้าน',
  'personalShop.info1': 'ตั้งราคาไอเทมทุกชิ้นก่อนเปิดร้าน',
  'personalShop.info2': 'ร้านจะปิดเมื่อคุณเคลื่อนที่หรือออกจากเกม',
  'personalShop.info3': 'ผู้ซื้อต้องยืนอยู่ข้างคุณ',
  'personalShop.info4': 'ไอเทมที่ตั้งราคาแล้วใช้หรือทิ้งไม่ได้',
  'personalShop.info5': 'เซนจะเข้ากระเป๋าของคุณโดยตรง',
  'personalShop.warn1': 'อย่าขายต่ำกว่ามูลค่าของไอเทม',
  'personalShop.warn2': 'เซิร์ฟเวอร์เป็นผู้ตัดสินราคาสุดท้าย',
} satisfies Partial<Record<keyof typeof en, string>>;
