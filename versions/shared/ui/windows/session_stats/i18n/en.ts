/** English text of the `session_stats` window. See src/i18n/readme.md. */

const en = {
  'session.title': 'Session',
  'session.time': 'Time',
  'session.exp': 'Exp',
  'session.kills': 'Kills',
  'session.zen': 'Zen',
  'session.reset': 'Reset',
};

export default en;

declare module '@/i18n' {
  interface TextOwners {
    'versions/shared/ui/windows/session_stats': typeof en;
  }
}
