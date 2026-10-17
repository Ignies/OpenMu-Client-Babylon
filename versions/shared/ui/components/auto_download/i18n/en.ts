/** English text of the `auto_download` UI component. See src/i18n/readme.md. */

const en = {
  'autoDownload.title': 'Downloading game data',
  'autoDownload.done': 'Game data downloaded',
  'autoDownload.cancel': 'Cancel',
  'autoDownload.hide': 'Hide (keeps downloading)',
  'autoDownload.phase.map': 'Loading map: {name}',
  'autoDownload.phase.icons': 'Loading items',
  'autoDownload.phase.audio': 'Loading music and sounds',
  'autoDownload.phase.monsters': 'Loading characters and creatures',
  'autoDownload.phase.core': 'Loading interface and effects',
  'autoDownload.left': '{left} MB left',
  'autoDownload.received': '{got} MB downloaded of {total} MB',
  'autoDownload.screenTitle': 'Preparing your adventure',
  'autoDownload.screenText': 'These files are kept so your next game loads faster. Only the first time.',
  'autoDownload.skip': 'Enter anyway',
  'autoDownload.skipNote': 'The download goes on in the background. If you close the game, it resumes where it stopped.',
};

export default en;

declare module '@/i18n' {
  interface TextOwners {
    'versions/shared/ui/components/auto_download': typeof en;
  }
}
