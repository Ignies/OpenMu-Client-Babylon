/** Thai text of the `window_menu` window. */

import type en from './en';

export default {
  'windowMenu.system': 'ระบบ (Esc)',
  'windowMenu.help': 'ช่วยเหลือ (F1)',
  'windowMenu.guild': 'กิลด์ (G)',
  'windowMenu.move': 'ย้าย (M)',
  'windowMenu.map': 'แผนที่ (Tab)',
  'windowMenu.gens': 'ข้อมูล Gens (B)',
} satisfies Partial<Record<keyof typeof en, string>>;
