/** English text of the `mu_window` interface widget. See src/i18n/readme.md. */

const en = {
  'window.resizeHint': 'Drag to resize, double-click to reset',
};

export default en;

declare module '@/i18n' {
  interface TextOwners {
    'src/controllers/interface/components/mu_window': typeof en;
  }
}
