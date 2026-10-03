/** Portuguese text of the `duel` window. */

import type en from './en';

export default {
  'duel.request': '{name} desafiou você para um duelo.',
  'duel.wins': '{winner} venceu o duelo contra {loser}.',
  'duel.watchTitle': 'Situação do duelo',
  'duel.channel': 'Canal de duelo {number}',
  'duel.emptyChannel': 'Canal vazio',
  'duel.join': 'Assistir',
  'duel.vs': 'VS',
  'duel.leaveWatch': 'Sair do canal de duelo',
  'duel.stop': 'Encerrar',
} satisfies Partial<Record<keyof typeof en, string>>;
