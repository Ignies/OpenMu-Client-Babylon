/** Thai text of the `instrument_window` window. */

import type en from './en';

export default {
  'instrument.title': 'เครื่องดนตรี',
  'instrument.load': 'โหลด MIDI',
  'instrument.noFile': 'ยังไม่ได้โหลดไฟล์',
  'instrument.loading': 'กำลังโหลดเครื่องดนตรี...',
  'instrument.play': 'เล่น',
  'instrument.pause': 'หยุดชั่วคราว',
  'instrument.stop': 'หยุด',
  'instrument.loop': 'วนซ้ำ',
  'instrument.channels': 'แชนแนล',
  'instrument.band': 'วง',
  'instrument.join': 'เข้าร่วม',
  'instrument.leave': 'ออก',
  'instrument.nearby': 'นักดนตรีใกล้เคียง',
  'instrument.none': 'ไม่มีใครเล่นดนตรีอยู่ใกล้ ๆ',
} satisfies Partial<Record<keyof typeof en, string>>;
