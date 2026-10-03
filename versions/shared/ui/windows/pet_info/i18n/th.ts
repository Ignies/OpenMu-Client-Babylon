/** Thai text of the `pet_info` window. */

import type en from './en';

export default {
  'petInfo.title': 'สัตว์เลี้ยง',
  'petInfo.darkHorse': 'ดาร์คฮอร์ส',
  'petInfo.darkRaven': 'ดาร์คเรเวน',
  'petInfo.notEquipped': 'ยังไม่ได้สวมใส่{pet}',
  'petInfo.waiting': 'กำลังรอข้อมูลสัตว์เลี้ยง...',
  'petInfo.level': 'เลเวล {level}',
  'petInfo.life': 'พลังชีวิต {current} / {max}',
  'petInfo.exp': 'ค่าประสบการณ์ {current} / {next}',
  'petInfo.damage': 'ดาเมจ {min}~{max} (อัตรา {rate})',
  'petInfo.attackSpeed': 'ความเร็วโจมตี {speed}',
  'petInfo.defense': 'ป้องกัน {defense}',
  'petInfo.command': 'คำสั่ง',
  'petInfo.cmdNormal': 'โจมตีปกติ',
  'petInfo.cmdRandom': 'โจมตีแบบสุ่ม',
  'petInfo.cmdOwner': 'โจมตีพร้อมเจ้าของ',
  'petInfo.cmdTarget': 'โจมตีเป้าหมาย',
  'petInfo.close': 'ปิด',
} satisfies Partial<Record<keyof typeof en, string>>;
