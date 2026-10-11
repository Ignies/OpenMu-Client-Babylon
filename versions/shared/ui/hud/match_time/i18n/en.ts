/** English text of the `match_time` HUD element: GlobalText 1390 / 1391, as the original words them. */

const en = {
  'matchTime.padded': 'Remaining hours {min}:0{sec}',
  'matchTime.plain': 'Remaining seconds {min}:{sec}',
};

export default en;

declare module '@/i18n' {
  interface TextOwners {
    'versions/shared/ui/hud/match_time': typeof en;
  }
}
