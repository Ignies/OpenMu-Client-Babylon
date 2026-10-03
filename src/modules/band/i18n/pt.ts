/** Portuguese text of the `band` module. */

import type en from './en';

export default {
  'instrument.guitar': 'Violão',
  'instrument.flute': 'Flauta',
  'instrument.ocarina': 'Ocarina',
  'instrument.harp': 'Harpa',
  'instrument.drums': 'Bateria',
  'instrument.track': 'Faixa',
  'instrument.notes': 'Notas',
  'instrument.owner': 'Tocado por',
  'instrument.you': 'você',
  'instrument.unassigned': 'ninguém',
  'instrument.startsPlaying': '{name} começa a tocar {instrument}',
  'instrument.stopsPlaying': '{name} para de tocar',
  'instrument.joinsBand': '{name} entra na banda de {master}',
  'instrument.leavesBand': '{name} sai da banda',
  'instrument.fileError': 'Esse arquivo não é um MIDI que este cliente consegue tocar',
  'instrument.unavailable': 'Instrumentos não estão disponíveis neste servidor',
  'instrument.stopped.flood': 'Sua apresentação foi interrompida: notas demais de uma vez',
  'instrument.stopped.order': 'Sua apresentação foi interrompida: as notas chegaram fora de ordem',
  'instrument.stopped.gone': 'O músico foi embora',
  'instrument.refused.cooldown': 'Você pode tocar de novo em {seconds} s',
  'instrument.refused.busy': 'Você já está tocando ou em uma banda',
  'instrument.refused.full': 'Músicos demais aqui agora',
  'instrument.refused.range': 'Longe demais do músico',
  'instrument.refused.map': 'O músico está em outro mapa',
  'instrument.refused.notPerforming': 'Esse jogador não está tocando',
  'instrument.refused.rate': 'Devagar',
} satisfies Partial<Record<keyof typeof en, string>>;
