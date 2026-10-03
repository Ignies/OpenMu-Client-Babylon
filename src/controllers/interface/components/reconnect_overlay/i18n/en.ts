/** English text of the `reconnect_overlay` interface widget. See src/i18n/readme.md. */

const en = {
  'resume.title': 'Connection lost',
  'resume.connecting': 'Reconnecting... (attempt {attempt})',
  'resume.loggingIn': 'Signing back in...',
  'resume.selecting': 'Entering the world...',
  'resume.cancel': 'Cancel',
};

export default en;

declare module '@/i18n' {
  interface TextOwners {
    'src/controllers/interface/components/reconnect_overlay': typeof en;
  }
}
