/** Spanish text of the `session` module. */

import type en from './en';

export default {
  'exit.chaosOpen': 'Cierra la ventana del Caos antes de salir del juego.',
  'exit.noAnswer': 'El servidor no respondió. Se sale de todos modos.',
  'resume.done': 'De nuevo en línea',
  'resume.failed': 'No se pudo reconectar',
  'resume.cancelled': 'Reconexión cancelada',
} satisfies Partial<Record<keyof typeof en, string>>;
