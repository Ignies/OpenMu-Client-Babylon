/** Thai text of several modules (no single owner). */

import type en from './en';

export default {
  'personalShop.needLevel': 'ร้านค้าส่วนตัวต้องใช้เลเวล 6',
  'personalShop.openFailed': 'เปิดร้านไม่สำเร็จ',
  'personalShop.cannotSell': 'ไอเทมนี้ขายในร้านไม่ได้',
  'personalShop.itemGone': 'ไอเทมนั้นไม่อยู่แล้ว',
  'guild.alreadyInGuild': 'คุณอยู่ในกิลด์อยู่แล้ว',
  'guild.notGuildMaster': 'ผู้เล่นคนนั้นไม่ใช่หัวหน้ากิลด์',
  'guild.requestFailed': 'คำขอกิลด์ไม่สำเร็จ',
  'quest.itemFallback': 'ไอเทม {id}',
  'event.shortOfZen': 'คุณมีเซนไม่พอ',
  'notify.negativePrice': 'ราคาติดลบไม่ได้',
} satisfies Partial<Record<keyof typeof en, string>>;
