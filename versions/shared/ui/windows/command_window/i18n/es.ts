/** Spanish text of the `command_window` window. */

import type en from './en';

export default {
  'command.title': 'Órdenes',
  'command.guild': 'Gremio',
  'command.guildUnion': 'Unión de gremios',
  'command.rival': 'Rival',
  'command.rivalOff': 'Quitar rival',
  'command.addFriend': 'Añadir amigo',
} satisfies Partial<Record<keyof typeof en, string>>;
