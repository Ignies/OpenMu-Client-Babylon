/** English text of the `skills` window. See src/i18n/readme.md. */

const en = {
  'skills.master': 'Master',
  'skills.levelShort': 'Lv {level}',
  'skills.masterLevelShort': 'Master Lv {level}',
};

export default en;

declare module '@/i18n' {
  interface TextOwners {
    'versions/shared/ui/windows/skills': typeof en;
  }
}
