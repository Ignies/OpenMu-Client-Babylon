/** Japanese text of the `command_window` window. */

import type en from './en';

export default {
  'command.title': 'コマンド',
  'command.guild': 'ギルド',
  'command.guildUnion': 'ギルド同盟',
  'command.rival': 'ライバル',
  'command.rivalOff': 'ライバル解除',
  'command.addFriend': 'フレンド追加',
} satisfies Partial<Record<keyof typeof en, string>>;
