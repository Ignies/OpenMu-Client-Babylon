/** English text of the `master_skills` window. See src/i18n/readme.md. */

const en = {
  'master.spendPoint': 'Spend {points} master point on {skill}?',
  'master.spendPoints': 'Spend {points} master points on {skill}?',
  'master.skillFallback': 'skill {number}',
};

export default en;

declare module '@/i18n' {
  interface TextOwners {
    'versions/shared/ui/windows/master_skills': typeof en;
  }
}
