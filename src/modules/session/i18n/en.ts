/** English text of the `session` module. See src/i18n/readme.md. */

const en = {
  /** GlobalText 592: the tray is lost if we leave with the mix window open. */
  'exit.chaosOpen': 'Exit game after closing the Chaos interface.',
  'exit.noAnswer': 'The server did not answer. Leaving anyway.',
  'resume.done': 'Back online',
  'resume.failed': 'Could not reconnect',
  'resume.cancelled': 'Reconnection cancelled',
};

export default en;

declare module '@/i18n' {
  interface TextOwners {
    'src/modules/session': typeof en;
  }
}
