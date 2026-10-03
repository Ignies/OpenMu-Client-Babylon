/** Romanian text of the `command_window` window. */

import type en from './en';

export default {
  'command.title': 'Comenzi',
  'command.guild': 'Breaslă',
  'command.guildUnion': 'Uniune de bresle',
  'command.rival': 'Rival',
  'command.rivalOff': 'Scoate rivalul',
  'command.addFriend': 'Adaugă prieten',
} satisfies Partial<Record<keyof typeof en, string>>;
