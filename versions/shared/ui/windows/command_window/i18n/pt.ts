/** Portuguese text of the `command_window` window. */

import type en from './en';

export default {
  'command.title': 'Comandos',
  'command.guild': 'Guilda',
  'command.guildUnion': 'União de guildas',
  'command.rival': 'Rival',
  'command.rivalOff': 'Tirar rival',
  'command.addFriend': 'Adicionar amigo',
} satisfies Partial<Record<keyof typeof en, string>>;
