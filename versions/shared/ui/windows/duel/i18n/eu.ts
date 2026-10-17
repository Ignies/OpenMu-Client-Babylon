/** eu text of `versions/shared/ui/windows/duel`. */

import type en from './en';

export default {
  'duel.request': '{name} jokalariak duelura desafiatu zaitu.',
  'duel.wins': '{winner} jokalariak irabazi dio duelua {loser} jokalariari.',
  'duel.watchTitle': 'Dueluaren egoera',
  'duel.channel': 'Duelu-kanala {number}',
  'duel.emptyChannel': 'Kanal hutsa',
  'duel.join': 'Ikusi',
  'duel.vs': 'VS',
  'duel.leaveWatch': 'Irten duelu-kanaletik',
  'duel.stop': 'Amaitu duelua',
} satisfies Partial<Record<keyof typeof en, string>>;
