/** English text of the `minimap` HUD element. See src/i18n/readme.md. */

const en = {
  'minimap.close': 'Close',
  'minimap.center': 'Center',
};

export default en;

declare module '@/i18n' {
  interface TextOwners {
    'versions/shared/ui/hud/minimap': typeof en;
  }
}
