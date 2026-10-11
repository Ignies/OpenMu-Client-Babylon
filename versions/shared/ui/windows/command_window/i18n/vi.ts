/** Vietnamese text of the `command_window` window. */

import type en from './en';

export default {
  'command.title': 'Lệnh',
  'command.guild': 'Bang hội',
  'command.guildUnion': 'Liên minh',
  'command.rival': 'Thù địch',
  'command.rivalOff': 'Hủy thù địch',
  'command.addFriend': 'Kết bạn',
} satisfies Partial<Record<keyof typeof en, string>>;
