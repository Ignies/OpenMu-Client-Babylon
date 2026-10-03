/** Russian text of the `command_window` window. */

import type en from './en';

export default {
  'command.title': 'Команды',
  'command.guild': 'Гильдия',
  'command.guildUnion': 'Союз гильдий',
  'command.rival': 'Соперник',
  'command.rivalOff': 'Убрать соперника',
  'command.addFriend': 'Добавить в друзья',
} satisfies Partial<Record<keyof typeof en, string>>;
