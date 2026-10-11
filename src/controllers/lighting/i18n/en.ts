/** English text of the `lighting` controller. See src/i18n/readme.md. */

const en = {
  'options.quality.ultra': 'Ultra',
};

export default en;

declare module '@/i18n' {
  interface TextOwners {
    'src/controllers/lighting': typeof en;
  }
}
