/** id text of `src/modules/band`. */

import type en from './en';

export default {
  'instrument.guitar': 'Gitar',
  'instrument.flute': 'Seruling',
  'instrument.ocarina': 'Okarina',
  'instrument.harp': 'Harpa',
  'instrument.drums': 'Drum',
  'instrument.you': 'kamu',
  'instrument.startsPlaying': '{name} mulai memainkan {instrument}',
  'instrument.stopsPlaying': '{name} berhenti bermain',
  'instrument.joinsBand': '{name} bergabung dengan band pemain {master}',
  'instrument.leavesBand': '{name} keluar dari band',
  'instrument.fileError': 'File itu bukan file MIDI yang dapat diputar klien ini',
  'instrument.unavailable': 'Alat musik tidak tersedia di server ini',
  'instrument.stopped.flood': 'Permainanmu dihentikan: terlalu banyak not sekaligus',
  'instrument.stopped.order': 'Permainanmu dihentikan: not datang tidak berurutan',
  'instrument.stopped.gone': 'Pemain musik sudah pergi',
  'instrument.refused.cooldown': 'Kamu bisa bermain lagi dalam {seconds} dtk',
  'instrument.refused.busy': 'Kamu sudah sedang bermain atau berada dalam band',
  'instrument.refused.full': 'Terlalu banyak pemain musik di sini saat ini',
  'instrument.refused.range': 'Terlalu jauh dari pemain musik',
  'instrument.refused.map': 'Pemain musik berada di peta lain',
  'instrument.refused.notPerforming': 'Pemain itu tidak sedang bermain musik',
  'instrument.refused.rate': 'Pelan-pelan',
} satisfies Partial<Record<keyof typeof en, string>>;
