/** French text of the `command_window` window. */

import type en from './en';

export default {
  'command.title': 'Commandes',
  'command.guild': 'Guilde',
  'command.guildUnion': 'Union de guildes',
  'command.rival': 'Rival',
  'command.rivalOff': 'Retirer rival',
  'command.addFriend': 'Ajouter un ami',
} satisfies Partial<Record<keyof typeof en, string>>;
