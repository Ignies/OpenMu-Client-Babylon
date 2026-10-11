/** English text of `versions/shared/monsters`. See src/i18n/readme.md. */

const en = {
  'item.monsterFallback': 'Monster {type}',
};

export default en;

declare module '@/i18n' {
  interface TextOwners {
    'versions/shared/monsters': typeof en;
  }
}
