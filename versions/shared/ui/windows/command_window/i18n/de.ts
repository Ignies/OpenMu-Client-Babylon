/** German text of the `command_window` window. */

import type en from './en';

export default {
  'command.title': 'Befehle',
  'command.guild': 'Gilde',
  'command.guildUnion': 'Gildenbund',
  'command.rival': 'Rivale',
  'command.rivalOff': 'Rivale aus',
  'command.addFriend': 'Freund hinzufügen',
} satisfies Partial<Record<keyof typeof en, string>>;
