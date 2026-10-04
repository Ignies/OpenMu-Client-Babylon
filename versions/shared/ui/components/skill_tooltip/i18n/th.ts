/** Thai text of the `skill_tooltip` UI component. */

import type en from './en';

export default {
  'skills.tooltip.unknown': 'สกิลที่ไม่รู้จัก',
  'skills.tooltip.class': 'อาชีพของคุณใช้ไม่ได้',
  'skills.tooltip.weapon': 'ต้องใช้อาวุธที่มีสกิลนี้',
  'skills.tooltip.cooldown': 'ยังไม่พร้อมใช้',
  'skills.tooltip.level': 'ต้องมีเลเวล {level}',
  'skills.tooltip.energy': 'ต้องมีพลังงาน {energy}',
  'skills.tooltip.mana': 'มานาไม่พอ ({mana})',
  'skills.tooltip.ag': 'AG ไม่พอ ({ag})',
  'skills.tooltip.safezone': 'ใช้ในเขตปลอดภัยไม่ได้',
  'skills.unnamed': 'สกิล #{number}',
  'skills.named': '{name} (Lv.{level})',
  'skills.damage': 'ดาเมจสกิล +{value}',
  'skills.distance': 'ระยะ: {value}',
  'skills.mana': 'มานา: {value}',
  'skills.ag': 'AG: {value}',
  'skills.readyIn': 'พร้อมใช้ใน {seconds} วิ',
  'skills.delay': 'ดีเลย์: {seconds} วิ',
} satisfies Partial<Record<keyof typeof en, string>>;
