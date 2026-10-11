/** English text of the `project_credits` window. See src/i18n/readme.md. */

const en = {
  'projectCredits.title': 'Credits',
  'projectCredits.thanks': 'Special thanks',
  'projectCredits.thanksNote': 'The projects and people this client builds on.',
  'projectCredits.contributors': 'Contributors',
  'projectCredits.playtesters': 'Playtesting',
  'projectCredits.reporters': 'Bug reports',
  'projectCredits.everyoneHeading': 'And',
  'projectCredits.everyone': 'Everyone who contributed',
  'projectCredits.commits': '{count} commits',
  'projectCredits.reports': '{count} reports',
  'projectCredits.owners': 'MU Online, its original client and game data: Webzen.',
  'projectCredits.season6': 'The original Season 6 credits roll is the Credit button on the server list.',
  'projectCredits.loading': 'Reading the credits...',
};

export default en;

declare module '@/i18n' {
  interface TextOwners {
    'versions/shared/ui/windows/project_credits': typeof en;
  }
}
