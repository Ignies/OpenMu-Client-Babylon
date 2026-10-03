/** English text of the `command_window` window. See src/i18n/readme.md. */

const en = {
  'command.title': 'Command',
  'command.guild': 'Guild',
  'command.guildUnion': 'Guild Union',
  'command.rival': 'Rival',
  'command.rivalOff': 'Rival Off',
  'command.addFriend': 'Add Friend',
};

export default en;

declare module '@/i18n' {
  interface TextOwners {
    'versions/shared/ui/windows/command_window': typeof en;
  }
}
