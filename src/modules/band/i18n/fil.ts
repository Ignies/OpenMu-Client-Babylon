/** fil text of `src/modules/band`. */

import type en from './en';

export default {
  'instrument.guitar': 'Gitara',
  'instrument.flute': 'Plawta',
  'instrument.ocarina': 'Ocarina',
  'instrument.harp': 'Alpa',
  'instrument.drums': 'Tambol',
  'instrument.you': 'ikaw',
  'instrument.startsPlaying': 'Nagsimulang tumugtog si {name} ng instrumentong {instrument}',
  'instrument.stopsPlaying': 'Tumigil sa pagtugtog si {name}',
  'instrument.joinsBand': 'Sumali si {name} sa banda (pinuno: {master})',
  'instrument.leavesBand': 'Umalis si {name} sa banda',
  'instrument.fileError': 'Hindi MIDI file na kayang patugtugin ng client na ito ang file na iyan',
  'instrument.unavailable': 'Walang mga instrumento sa server na ito',
  'instrument.stopped.flood': 'Itinigil ang iyong pagtugtog: masyadong maraming nota nang sabay',
  'instrument.stopped.order':
    'Itinigil ang iyong pagtugtog: hindi sunud-sunod ang dating ng mga nota',
  'instrument.stopped.gone': 'Wala na ang tumutugtog',
  'instrument.refused.cooldown': 'Makatutugtog ka muli sa loob ng {seconds} s',
  'instrument.refused.busy': 'Tumutugtog ka na o kasapi ka na ng banda',
  'instrument.refused.full': 'Masyadong maraming tumutugtog dito ngayon',
  'instrument.refused.range': 'Masyadong malayo sa tumutugtog',
  'instrument.refused.map': 'Nasa ibang mapa ang tumutugtog',
  'instrument.refused.notPerforming': 'Hindi tumutugtog ang manlalarong iyan',
  'instrument.refused.rate': 'Dahan-dahan lang',
} satisfies Partial<Record<keyof typeof en, string>>;
