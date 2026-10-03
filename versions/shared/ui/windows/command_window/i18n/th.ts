/** Thai text of the `command_window` window. */

import type en from './en';

export default {
  'command.title': 'คำสั่ง',
  'command.guild': 'กิลด์',
  'command.guildUnion': 'พันธมิตรกิลด์',
  'command.rival': 'คู่แข่ง',
  'command.rivalOff': 'ยกเลิกคู่แข่ง',
  'command.addFriend': 'เพิ่มเพื่อน',
} satisfies Partial<Record<keyof typeof en, string>>;
