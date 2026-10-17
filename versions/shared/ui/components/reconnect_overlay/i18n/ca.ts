/** ca text of `versions/shared/ui/components/reconnect_overlay`. */

import type en from './en';

export default {
  'resume.title': 'Connexió perduda',
  'resume.connecting': 'S\'està reconnectant... (intent {attempt})',
  'resume.loggingIn': 'S\'està tornant a iniciar la sessió...',
  'resume.selecting': 'S\'està entrant al món...',
  'resume.cancel': 'Cancel·la',
} satisfies Partial<Record<keyof typeof en, string>>;
