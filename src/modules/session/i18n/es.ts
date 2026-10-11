/** Spanish text of the `session` module. */

import type en from './en';

export default {
  'exit.chaosOpen': 'Cierra la ventana del Caos antes de salir del juego.',
  'exit.noAnswer': 'El servidor no respondió. Se sale de todos modos.',
  'resume.done': 'De nuevo en línea',
  'resume.failed': 'No se pudo reconectar',
  'resume.cancelled': 'Reconexión cancelada',
  'login.closingOldSession': 'La cuenta sigue conectada: cerrando la sesión anterior y reintentando...',
  'login.tokenRefused': 'Tu inicio de sesión guardado ha caducado. Escribe tu contraseña.',
} satisfies Partial<Record<keyof typeof en, string>>;
