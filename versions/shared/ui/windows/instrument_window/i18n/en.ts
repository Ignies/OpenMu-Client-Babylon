/** English text of the `instrument_window` window. See src/i18n/readme.md. */

const en = {
  'instrument.title': 'Instrument',
  'instrument.load': 'Load MIDI',
  'instrument.noFile': 'No file loaded',
  'instrument.loading': 'Loading instrument...',
  'instrument.play': 'Play',
  'instrument.pause': 'Pause',
  'instrument.stop': 'Stop',
  'instrument.loop': 'Loop',
  'instrument.channels': 'Channels',
  'instrument.band': 'Band',
  'instrument.join': 'Join',
  'instrument.leave': 'Leave',
  'instrument.nearby': 'Nearby performers',
  'instrument.none': 'Nobody is playing nearby',
};

export default en;

declare module '@/i18n' {
  interface TextOwners {
    'versions/shared/ui/windows/instrument_window': typeof en;
  }
}
