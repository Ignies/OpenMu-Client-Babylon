/** Portuguese text of the `chat` HUD element. */

import type en from './en';

export default {
  'chat.normal': 'Normal',
  'chat.gens': 'Gens',
  'chat.blockWhisper': 'Bloquear sussurros',
  'chat.system': 'Mensagens do sistema',
  'chat.log': 'Registro do chat',
  'chat.frame': 'Moldura',
  'chat.size': 'Tamanho',
  'chat.alpha': 'Transparência',
  'chat.whisperOff': 'Os sussurros estão desligados (F3)',
  'chat.emoji.button': 'Emojis',
  'chat.emoji.recent': 'Usados recentemente',
  'chat.latest': 'Voltar às mensagens mais recentes',
} satisfies Partial<Record<keyof typeof en, string>>;
