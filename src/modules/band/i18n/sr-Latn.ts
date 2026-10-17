/** sr-Latn text of `src/modules/band`. */

import type en from './en';

export default {
  'instrument.guitar': 'Gitara',
  'instrument.flute': 'Flauta',
  'instrument.ocarina': 'Okarina',
  'instrument.harp': 'Harfa',
  'instrument.drums': 'Bubnjevi',
  'instrument.you': 'ti',
  'instrument.startsPlaying': 'Igrač {name} počinje da svira: {instrument}',
  'instrument.stopsPlaying': 'Igrač {name} prestaje da svira',
  'instrument.joinsBand': 'Igrač {name} se pridružuje bendu igrača {master}',
  'instrument.leavesBand': 'Igrač {name} napušta bend',
  'instrument.fileError': 'Ta datoteka nije MIDI datoteka koju ovaj klijent može da pusti',
  'instrument.unavailable': 'Instrumenti nisu dostupni na ovom serveru',
  'instrument.stopped.flood': 'Tvoj nastup je prekinut: previše nota odjednom',
  'instrument.stopped.order': 'Tvoj nastup je prekinut: note su stigle pogrešnim redom',
  'instrument.stopped.gone': 'Muzičara više nema',
  'instrument.refused.cooldown': 'Možeš ponovo da sviraš za {seconds} s',
  'instrument.refused.busy': 'Već nastupaš ili si u bendu',
  'instrument.refused.full': 'Trenutno ima previše muzičara ovde',
  'instrument.refused.range': 'Predaleko si od muzičara',
  'instrument.refused.map': 'Muzičar je na drugoj mapi',
  'instrument.refused.notPerforming': 'Taj igrač ne svira',
  'instrument.refused.rate': 'Uspori',
} satisfies Partial<Record<keyof typeof en, string>>;
