/** ca text of `src/modules/band`. */

import type en from './en';

export default {
  'instrument.guitar': 'Guitarra',
  'instrument.flute': 'Flauta',
  'instrument.ocarina': 'Ocarina',
  'instrument.harp': 'Arpa',
  'instrument.drums': 'Bateria',
  'instrument.you': 'tu',
  'instrument.startsPlaying': '{name} comença a tocar: {instrument}',
  'instrument.stopsPlaying': '{name} deixa de tocar',
  'instrument.joinsBand': '{name} s\'uneix a la banda del jugador {master}',
  'instrument.leavesBand': '{name} deixa la banda',
  'instrument.fileError': 'Aquest fitxer no és un MIDI que aquest client pugui reproduir',
  'instrument.unavailable': 'Els instruments no estan disponibles en aquest servidor',
  'instrument.stopped.flood': 'S\'ha aturat la teva interpretació: massa notes alhora',
  'instrument.stopped.order':
    'S\'ha aturat la teva interpretació: les notes han arribat desordenades',
  'instrument.stopped.gone': 'L\'intèrpret ja no hi és',
  'instrument.refused.cooldown': 'Podràs tornar a tocar d\'aquí a {seconds} s',
  'instrument.refused.busy': 'Ja estàs tocant o formes part d\'una banda',
  'instrument.refused.full': 'Ara mateix hi ha massa músics aquí',
  'instrument.refused.range': 'Ets massa lluny de l\'intèrpret',
  'instrument.refused.map': 'L\'intèrpret és en un altre mapa',
  'instrument.refused.notPerforming': 'Aquest jugador no està tocant',
  'instrument.refused.rate': 'Més a poc a poc',
} satisfies Partial<Record<keyof typeof en, string>>;
