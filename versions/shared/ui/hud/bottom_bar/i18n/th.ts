/** Thai text of the `bottom_bar` HUD element. */

import type en from './en';

export default {
  'bottomBar.itemShop': 'ร้านไอเทม',
  'bottomBar.characterInfo': 'ข้อมูลตัวละคร',
  'bottomBar.inventory': 'กระเป๋า',
  'bottomBar.friendList': 'รายชื่อเพื่อน',
  'bottomBar.options': 'ตัวเลือก',
  'bottomBar.noSkill': 'ไม่มีสกิล (คลิกขวา = โจมตี)',
  'bottomBar.emptySlot': '[{key}] ว่าง',
  'bottomBar.itemSlot': '{name} [{key}]',
  'bottomBar.skillHint': ' - คลิก: รายการสกิล, คลิกขวา: โจมตีธรรมดา',
  'bottomBar.pickSkill': '[{key}] ว่าง - คลิกเพื่อเลือกสกิล',
  'bottomBar.boundSlot': '{name} [{key}] - คลิกขวาเพื่อเปลี่ยน',
  'bottomBar.clearSlot': 'ปล่อยช่อง [{key}] ให้ว่าง',
  'bottomBar.pet.normal': 'ปกติ',
  'bottomBar.pet.random': 'สุ่ม',
  'bottomBar.pet.owner': 'เจ้าของ',
  'bottomBar.pet.target': 'เป้าหมาย',
  'bottomBar.pet.needTarget': 'เลือกเป้าหมายให้อีกาก่อน',
  'exp.title': 'ค่าประสบการณ์',
} satisfies Partial<Record<keyof typeof en, string>>;
