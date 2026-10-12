/** Thai text of the `character_info` window. */

import type en from './en';

export default {
  'stat.short.strength': 'STR',
  'stat.short.agility': 'AGI',
  'stat.short.vitality': 'VIT',
  'stat.short.energy': 'ENE',

  'charInfo.dmgRate': 'ดาเมจ (อัตรา): {min}~{max} ({rate})',
  'charInfo.dmg': 'ดาเมจ: {min}~{max}',
  'charInfo.attackRate': 'อัตราโจมตีสำเร็จ: {value}',
  'charInfo.attackRateBonus': 'อัตราโจมตีสำเร็จ: {value} (+{bonus})',
  'charInfo.defenseRateFull': 'ป้องกัน (อัตรา): {defense} ({rate} +{bonus})',
  'charInfo.defenseRate': 'ป้องกัน (อัตรา): {defense} ({rate})',
  'charInfo.defenseFull': 'ป้องกัน: {defense} (+{bonus})',
  'charInfo.defense': 'ป้องกัน: {defense}',
  'charInfo.defenseRatePvp': 'อัตราป้องกันสำเร็จ: {value}',
  'charInfo.defenseRatePvpBonus': 'อัตราป้องกันสำเร็จ: {value} (+{bonus})',
  'charInfo.hp': 'HP: {current} / {max}',
  'charInfo.meleeDamage': 'ดาเมจระยะประชิด: {value}%',
  'charInfo.mana': 'มานา: {current} / {max}',
  'charInfo.wizardryRate': 'ดาเมจเวทมนตร์: {min}~{max} (+{rate})',
  'charInfo.wizardry': 'ดาเมจเวทมนตร์: {min}~{max}',
  'charInfo.curseSpell': ' คาถาสาปแช่ง: {min} ~ {max}',
  'charInfo.curseSpellRate': ' คาถาสาปแช่ง: {min} ~ {max}(+{rate})',
  'charInfo.skillDamage': 'ดาเมจสกิล: {value}%',
  'charInfo.divineDamage': 'ดาเมจศักดิ์สิทธิ์ (Roar, Slasher): {value}%',
  'charInfo.aoeDamage': 'ดาเมจเป็นพื้นที่ (Dark Side): {value}%',
  'charInfo.addAmount': 'จำนวนแต้มที่จะเพิ่ม',
  'charInfo.stopAdding': 'หยุด',

  'characterInfo.title': 'ตัวละคร',
  'characterInfo.close': 'ปิด (C)',
  'characterInfo.quest': 'เควส (T)',
  'characterInfo.pet': 'สัตว์เลี้ยง',
  'characterInfo.masterTree': 'ผังสกิลมาสเตอร์ (A)',
} satisfies Partial<Record<keyof typeof en, string>>;
