/** Romanian text of the `band` module. */

import type en from './en';

export default {
  'instrument.guitar': 'Chitară',
  'instrument.flute': 'Flaut',
  'instrument.ocarina': 'Ocarină',
  'instrument.harp': 'Harpă',
  'instrument.drums': 'Tobe',
  'instrument.track': 'Pistă',
  'instrument.notes': 'Note',
  'instrument.owner': 'Cântat de',
  'instrument.you': 'tu',
  'instrument.unassigned': 'nimeni',
  'instrument.startsPlaying': '{name} începe să cânte la {instrument}',
  'instrument.stopsPlaying': '{name} se oprește din cântat',
  'instrument.joinsBand': '{name} se alătură trupei lui {master}',
  'instrument.leavesBand': '{name} părăsește trupa',
  'instrument.fileError': 'Acest fișier nu este un MIDI pe care clientul îl poate reda',
  'instrument.unavailable': 'Instrumentele nu sunt disponibile pe acest server',
  'instrument.stopped.flood': 'Reprezentația ta a fost oprită: prea multe note deodată',
  'instrument.stopped.order': 'Reprezentația ta a fost oprită: notele au sosit în dezordine',
  'instrument.stopped.gone': 'Muzicianul a plecat',
  'instrument.refused.cooldown': 'Poți cânta din nou în {seconds} s',
  'instrument.refused.busy': 'Deja cânți sau ești într-o trupă',
  'instrument.refused.full': 'Prea mulți muzicieni aici acum',
  'instrument.refused.range': 'Prea departe de muzician',
  'instrument.refused.map': 'Muzicianul este pe altă hartă',
  'instrument.refused.notPerforming': 'Acel jucător nu cântă',
  'instrument.refused.rate': 'Mai încet',
} satisfies Partial<Record<keyof typeof en, string>>;
