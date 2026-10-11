/** English text of the `window_menu` window (GlobalText 1741, 1742, 364, 1743, 3055, 3103). See src/i18n/readme.md. */

const en = {
  'windowMenu.system': 'System (Esc)',
  'windowMenu.help': 'Help (F1)',
  'windowMenu.guild': 'Guild (G)',
  'windowMenu.move': 'Move (M)',
  'windowMenu.map': 'Map (Tab)',
  'windowMenu.gens': 'Gens Info (B)',
};

export default en;

declare module '@/i18n' {
  interface TextOwners {
    'versions/shared/ui/windows/window_menu': typeof en;
  }
}
