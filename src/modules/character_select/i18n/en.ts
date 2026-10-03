/** English text of the `character_select` module. See src/i18n/readme.md. */

const en = {
  'characters.create.minLength': 'Type more than 4 letters',
  'characters.create.specialName': 'Cannot use symbols.',
  'characters.create.reservedName': 'That name is reserved.',
  'characters.create.failed':
    'Incorrect character name was entered or same character name exists.',
};

export default en;

declare module '@/i18n' {
  interface TextOwners {
    'src/modules/character_select': typeof en;
  }
}
