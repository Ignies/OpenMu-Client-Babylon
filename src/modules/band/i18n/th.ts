/** Thai text of the `band` module. */

import type en from './en';

export default {
  'instrument.guitar': 'กีตาร์',
  'instrument.flute': 'ขลุ่ย',
  'instrument.ocarina': 'โอคารินา',
  'instrument.harp': 'ฮาร์ป',
  'instrument.drums': 'กลองชุด',
  'instrument.you': 'คุณ',
  'instrument.startsPlaying': '{name} เริ่มเล่น{instrument}',
  'instrument.stopsPlaying': '{name} หยุดเล่น',
  'instrument.joinsBand': '{name} เข้าร่วมวงของ {master}',
  'instrument.leavesBand': '{name} ออกจากวง',
  'instrument.fileError': 'ไฟล์นี้ไม่ใช่ MIDI ที่ไคลเอนต์นี้เล่นได้',
  'instrument.unavailable': 'เซิร์ฟเวอร์นี้ไม่มีเครื่องดนตรี',
  'instrument.stopped.flood': 'การเล่นของคุณถูกหยุด: โน้ตมากเกินไปในครั้งเดียว',
  'instrument.stopped.order': 'การเล่นของคุณถูกหยุด: โน้ตมาถึงผิดลำดับ',
  'instrument.stopped.gone': 'นักดนตรีไม่อยู่แล้ว',
  'instrument.refused.cooldown': 'เล่นได้อีกครั้งใน {seconds} วินาที',
  'instrument.refused.busy': 'คุณกำลังเล่นอยู่หรืออยู่ในวงแล้ว',
  'instrument.refused.full': 'ตอนนี้มีนักดนตรีที่นี่มากเกินไป',
  'instrument.refused.range': 'อยู่ไกลจากนักดนตรีเกินไป',
  'instrument.refused.map': 'นักดนตรีอยู่คนละแผนที่',
  'instrument.refused.notPerforming': 'ผู้เล่นคนนั้นไม่ได้เล่นดนตรี',
  'instrument.refused.rate': 'ช้าลงหน่อย',
} satisfies Partial<Record<keyof typeof en, string>>;
