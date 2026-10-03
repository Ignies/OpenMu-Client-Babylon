/** German text of the `band` module. */

import type en from './en';

export default {
  'instrument.guitar': 'Gitarre',
  'instrument.flute': 'Flöte',
  'instrument.ocarina': 'Okarina',
  'instrument.harp': 'Harfe',
  'instrument.drums': 'Schlagzeug',
  'instrument.you': 'dir',
  'instrument.startsPlaying': '{name} beginnt, {instrument} zu spielen',
  'instrument.stopsPlaying': '{name} hört auf zu spielen',
  'instrument.joinsBand': '{name} tritt der Band von {master} bei',
  'instrument.leavesBand': '{name} verlässt die Band',
  'instrument.fileError': 'Diese Datei ist keine MIDI-Datei, die dieser Client abspielen kann',
  'instrument.unavailable': 'Instrumente sind auf diesem Server nicht verfügbar',
  'instrument.stopped.flood': 'Dein Auftritt wurde beendet: zu viele Noten auf einmal',
  'instrument.stopped.order': 'Dein Auftritt wurde beendet: die Noten kamen in falscher Reihenfolge',
  'instrument.stopped.gone': 'Der Musiker ist weg',
  'instrument.refused.cooldown': 'Du kannst in {seconds} s wieder spielen',
  'instrument.refused.busy': 'Du spielst bereits oder bist in einer Band',
  'instrument.refused.full': 'Zu viele Musiker gerade hier',
  'instrument.refused.range': 'Zu weit vom Musiker entfernt',
  'instrument.refused.map': 'Der Musiker ist auf einer anderen Karte',
  'instrument.refused.notPerforming': 'Dieser Spieler spielt nicht',
  'instrument.refused.rate': 'Langsamer',
} satisfies Partial<Record<keyof typeof en, string>>;
