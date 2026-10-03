/** English text of the `chaos_machine` window. See src/i18n/readme.md. */

const en = {
  'chaos.title': 'Chaos Machine',
  'chaos.combine': 'Combine',
  'chaos.combining': 'Combining…',
  'chaos.tax': 'Chaos tax: {rate}%',

  'chaosCard.title': 'Chaos Card',
  'chaosCard.hint1': 'Put a Chaos Card into the tray',
  'chaosCard.hint2': 'and press combine to open it.',
};

export default en;

declare module '@/i18n' {
  interface TextOwners {
    'versions/shared/ui/windows/chaos_machine': typeof en;
  }
}
