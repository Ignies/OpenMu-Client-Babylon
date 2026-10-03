/** Italian text of the `command_window` window. */

import type en from './en';

export default {
  'command.title': 'Comandi',
  'command.guild': 'Gilda',
  'command.guildUnion': 'Unione di gilde',
  'command.rival': 'Rivale',
  'command.rivalOff': 'Togli rivale',
  'command.addFriend': 'Aggiungi amico',
} satisfies Partial<Record<keyof typeof en, string>>;
