/** English text of the `camera_reset` HUD element. See src/i18n/readme.md. */

const en = {
  'camera.reset': 'Reset camera',
};

export default en;

declare module '@/i18n' {
  interface TextOwners {
    'versions/shared/ui/hud/camera_reset': typeof en;
  }
}
