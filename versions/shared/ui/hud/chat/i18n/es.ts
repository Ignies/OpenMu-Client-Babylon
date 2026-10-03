/** Spanish text of the `chat` HUD element. */

import type en from './en';

export default {
  'chat.normal': 'Normal',
  'chat.gens': 'Gens',
  'chat.blockWhisper': 'Bloquear susurros',
  'chat.system': 'Mensajes del sistema',
  'chat.log': 'Registro del chat',
  'chat.frame': 'Marco',
  'chat.size': 'Tamaño',
  'chat.alpha': 'Transparencia',
  'chat.whisperOff': 'Los susurros están desactivados (F3)',
  'chat.emoji.button': 'Emojis',
  'chat.emoji.recent': 'Usados recientemente',
  'chat.latest': 'Volver a los mensajes más recientes',
} satisfies Partial<Record<keyof typeof en, string>>;
