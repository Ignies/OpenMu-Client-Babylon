/** Korean text of the `command_window` window. */

import type en from './en';

export default {
  'command.title': '명령',
  'command.guild': '길드',
  'command.guildUnion': '길드 연합',
  'command.rival': '적대',
  'command.rivalOff': '적대 해제',
  'command.addFriend': '친구 추가',
} satisfies Partial<Record<keyof typeof en, string>>;
