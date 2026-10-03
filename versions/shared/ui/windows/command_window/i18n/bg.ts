/** Bulgarian text of the `command_window` window. */

import type en from './en';

export default {
  'command.title': 'Команди',
  'command.guild': 'Гилдия',
  'command.guildUnion': 'Съюз на гилдии',
  'command.rival': 'Съперник',
  'command.rivalOff': 'Махни съперника',
  'command.addFriend': 'Добави приятел',
} satisfies Partial<Record<keyof typeof en, string>>;
