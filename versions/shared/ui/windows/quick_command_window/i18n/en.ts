/** English text of the `quick_command_window` window. See src/i18n/readme.md. */

const en = {
  'command.attack': 'Attack',
};

export default en;

declare module '@/i18n' {
  interface TextOwners {
    'versions/shared/ui/windows/quick_command_window': typeof en;
  }
}
