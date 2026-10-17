/** cs text of `versions/shared/ui/windows/command_window`. */

import type en from './en';

export default {
  'command.title': 'Příkazy',
  'command.guild': 'Cech',
  'command.guildUnion': 'Aliance cechů',
  'command.rival': 'Soupeř',
  'command.rivalOff': 'Zrušit soupeře',
  'command.addFriend': 'Přidat přítele',
} satisfies Partial<Record<keyof typeof en, string>>;
