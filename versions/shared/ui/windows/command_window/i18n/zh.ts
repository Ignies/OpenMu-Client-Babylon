/** Chinese text of the `command_window` window. */

import type en from './en';

export default {
  'command.title': '命令',
  'command.guild': '公会',
  'command.guildUnion': '公会联盟',
  'command.rival': '敌对',
  'command.rivalOff': '解除敌对',
  'command.addFriend': '添加好友',
} satisfies Partial<Record<keyof typeof en, string>>;
