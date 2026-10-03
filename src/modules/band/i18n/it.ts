/** Italian text of the `band` module. */

import type en from './en';

export default {
  'instrument.guitar': 'Chitarra',
  'instrument.flute': 'Flauto',
  'instrument.ocarina': 'Ocarina',
  'instrument.harp': 'Arpa',
  'instrument.drums': 'Batteria',
  'instrument.track': 'Traccia',
  'instrument.notes': 'Note',
  'instrument.owner': 'Suonato da',
  'instrument.you': 'tu',
  'instrument.unassigned': 'nessuno',
  'instrument.startsPlaying': '{name} inizia a suonare: {instrument}',
  'instrument.stopsPlaying': '{name} smette di suonare',
  'instrument.joinsBand': '{name} si unisce al gruppo di {master}',
  'instrument.leavesBand': '{name} lascia il gruppo',
  'instrument.fileError': 'Questo file non è un MIDI che il client può suonare',
  'instrument.unavailable': 'Gli strumenti non sono disponibili su questo server',
  'instrument.stopped.flood': 'La tua esibizione è stata interrotta: troppe note insieme',
  'instrument.stopped.order': 'La tua esibizione è stata interrotta: le note sono arrivate fuori ordine',
  'instrument.stopped.gone': 'Il musicista se n\'è andato',
  'instrument.refused.cooldown': 'Potrai suonare di nuovo tra {seconds} s',
  'instrument.refused.busy': 'Stai già suonando o sei in un gruppo',
  'instrument.refused.full': 'Troppi musicisti qui in questo momento',
  'instrument.refused.range': 'Troppo lontano dal musicista',
  'instrument.refused.map': 'Il musicista è su un\'altra mappa',
  'instrument.refused.notPerforming': 'Quel giocatore non sta suonando',
  'instrument.refused.rate': 'Rallenta',
} satisfies Partial<Record<keyof typeof en, string>>;
