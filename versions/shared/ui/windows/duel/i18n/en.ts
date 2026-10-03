/** English text of the `duel` window. See src/i18n/readme.md. */

const en = {
  'duel.request': '{name} has challenged you to a duel.',
  'duel.wins': '{winner} has won the duel against {loser}.',
  'duel.score': 'Score',
  'duel.watchTitle': 'Duel Status',
  'duel.channel': 'Duel Channel {number}',
  'duel.emptyChannel': 'Empty channel',
  'duel.join': 'Watch',
  'duel.vs': 'VS',
  'duel.leaveWatch': 'Leave the duel channel',
  'duel.stop': 'End duel',
};

export default en;

declare module '@/i18n' {
  interface TextOwners {
    'versions/shared/ui/windows/duel': typeof en;
  }
}
