/** English text of the `move_command_window` window. See src/i18n/readme.md. */

const en = {
  'warp.favouriteHint': 'Right click to star this map and keep it on top',
  'moveList.title': 'Move list',
  'warp.map': 'Map',
  'warp.minLevel': 'Min. Lvl',
  'warp.cost': 'Cost',
};

export default en;

declare module '@/i18n' {
  interface TextOwners {
    'versions/shared/ui/windows/move_command_window': typeof en;
  }
}
