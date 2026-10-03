/** English text of the `perf_readout` HUD element. See src/i18n/readme.md. */

const en = {
  'perf.fps': 'FPS',
  'perf.frame': 'Frame',
  'perf.ping': 'Ping',
};

export default en;

declare module '@/i18n' {
  interface TextOwners {
    'versions/shared/ui/hud/perf_readout': typeof en;
  }
}
