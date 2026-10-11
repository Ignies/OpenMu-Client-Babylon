/** English text of the `band` module. See src/i18n/readme.md. */

const en = {
  'instrument.guitar': 'Guitar',
  'instrument.flute': 'Flute',
  'instrument.ocarina': 'Ocarina',
  'instrument.harp': 'Harp',
  'instrument.drums': 'Drums',
  'instrument.you': 'you',
  'instrument.startsPlaying': '{name} starts playing the {instrument}',
  'instrument.stopsPlaying': '{name} stops playing',
  'instrument.joinsBand': '{name} joins {master}\'s band',
  'instrument.leavesBand': '{name} leaves the band',
  'instrument.fileError': 'That file is not a MIDI file this client can play',
  'instrument.unavailable': 'Instruments are not available on this server',
  'instrument.stopped.flood': 'Your performance was stopped: too many notes at once',
  'instrument.stopped.order': 'Your performance was stopped: the notes arrived out of order',
  'instrument.stopped.gone': 'The performer is gone',
  'instrument.refused.cooldown': 'You can play again in {seconds} s',
  'instrument.refused.busy': 'You are already performing or in a band',
  'instrument.refused.full': 'Too many performers here right now',
  'instrument.refused.range': 'Too far from the performer',
  'instrument.refused.map': 'The performer is on another map',
  'instrument.refused.notPerforming': 'That player is not performing',
  'instrument.refused.rate': 'Slow down',
};

export default en;

declare module '@/i18n' {
  interface TextOwners {
    'src/modules/band': typeof en;
  }
}
