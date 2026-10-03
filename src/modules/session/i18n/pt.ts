/** Portuguese text of the `session` module. */

import type en from './en';

export default {
  'exit.chaosOpen': 'Fecha a janela do Chaos antes de sair do jogo.',
  'exit.noAnswer': 'O servidor não respondeu. A sair mesmo assim.',
  'resume.done': 'De volta online',
  'resume.failed': 'Não foi possível reconectar',
  'resume.cancelled': 'Reconexão cancelada',
} satisfies Partial<Record<keyof typeof en, string>>;
