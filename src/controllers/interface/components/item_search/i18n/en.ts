/** English text of the `item_search` interface widget. See src/i18n/readme.md. */

const en = {
  'search.placeholder': 'Find...',
  'search.hint': 'Type to fade everything that does not match. Esc clears.',
};

export default en;

declare module '@/i18n' {
  interface TextOwners {
    'src/controllers/interface/components/item_search': typeof en;
  }
}
