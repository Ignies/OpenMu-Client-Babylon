/** Spanish text of the `band` module. */

import type en from './en';

export default {
  'instrument.guitar': 'Guitarra',
  'instrument.flute': 'Flauta',
  'instrument.ocarina': 'Ocarina',
  'instrument.harp': 'Arpa',
  'instrument.drums': 'Batería',
  'instrument.track': 'Pista',
  'instrument.notes': 'Notas',
  'instrument.owner': 'Tocado por',
  'instrument.you': 'tú',
  'instrument.unassigned': 'nadie',
  'instrument.startsPlaying': '{name} empieza a tocar la {instrument}',
  'instrument.stopsPlaying': '{name} deja de tocar',
  'instrument.joinsBand': '{name} se une a la banda de {master}',
  'instrument.leavesBand': '{name} deja la banda',
  'instrument.fileError': 'Ese archivo no es un MIDI que este cliente pueda tocar',
  'instrument.unavailable': 'Los instrumentos no están disponibles en este servidor',
  'instrument.stopped.flood': 'Tu actuación se detuvo: demasiadas notas a la vez',
  'instrument.stopped.order': 'Tu actuación se detuvo: las notas llegaron desordenadas',
  'instrument.stopped.gone': 'El músico se ha ido',
  'instrument.refused.cooldown': 'Podrás tocar de nuevo en {seconds} s',
  'instrument.refused.busy': 'Ya estás tocando o en una banda',
  'instrument.refused.full': 'Demasiados músicos aquí ahora mismo',
  'instrument.refused.range': 'Demasiado lejos del músico',
  'instrument.refused.map': 'El músico está en otro mapa',
  'instrument.refused.notPerforming': 'Ese jugador no está tocando',
  'instrument.refused.rate': 'Más despacio',
} satisfies Partial<Record<keyof typeof en, string>>;
