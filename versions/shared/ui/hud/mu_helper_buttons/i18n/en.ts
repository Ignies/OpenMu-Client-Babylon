/** English text of the `mu_helper_buttons` HUD element. See src/i18n/readme.md. */

const en = {
  'muHelperButtons.start': 'Start helper',
  'muHelperButtons.stop': 'Stop helper',
  'muHelperButtons.settings': 'Helper settings',
};

export default en;

declare module '@/i18n' {
  interface TextOwners {
    'versions/shared/ui/hud/mu_helper_buttons': typeof en;
  }
}
