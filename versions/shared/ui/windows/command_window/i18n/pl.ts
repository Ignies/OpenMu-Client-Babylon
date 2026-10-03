/** Polish text of the `command_window` window. */

import type en from './en';

export default {
  'command.title': 'Polecenia',
  'command.guild': 'Gildia',
  'command.guildUnion': 'Sojusz gildii',
  'command.rival': 'Rywal',
  'command.rivalOff': 'Bez rywala',
  'command.addFriend': 'Dodaj znaj.',
} satisfies Partial<Record<keyof typeof en, string>>;
