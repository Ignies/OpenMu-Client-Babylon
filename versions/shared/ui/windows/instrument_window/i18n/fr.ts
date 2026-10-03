/** French text of the `instrument_window` window. */

import type en from './en';

export default {
  'instrument.title': 'Instrument',
  'instrument.load': 'Charger un MIDI',
  'instrument.noFile': 'Aucun fichier chargé',
  'instrument.loading': 'Chargement de l\'instrument...',
  'instrument.play': 'Jouer',
  'instrument.pause': 'Pause',
  'instrument.stop': 'Arrêter',
  'instrument.loop': 'Boucle',
  'instrument.channels': 'Canaux',
  'instrument.band': 'Groupe',
  'instrument.join': 'Rejoindre',
  'instrument.leave': 'Quitter',
  'instrument.nearby': 'Musiciens à proximité',
  'instrument.none': 'Personne ne joue à proximité',
} satisfies Partial<Record<keyof typeof en, string>>;
