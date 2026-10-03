/** Bulgarian text of the `duel` window. */

import type en from './en';

export default {
  'duel.request': '{name} те предизвика на дуел.',
  'duel.wins': '{winner} спечели дуела срещу {loser}.',
  'duel.watchTitle': 'Състояние на дуела',
  'duel.channel': 'Канал за дуел {number}',
  'duel.emptyChannel': 'Празен канал',
  'duel.join': 'Гледай',
  'duel.vs': 'VS',
  'duel.leaveWatch': 'Напусни канала за дуел',
  'duel.stop': 'Прекрати',
} satisfies Partial<Record<keyof typeof en, string>>;
