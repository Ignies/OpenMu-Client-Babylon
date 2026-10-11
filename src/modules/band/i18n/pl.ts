/** Polish text of the `band` module. */

import type en from './en';

export default {
  'instrument.guitar': 'Gitara',
  'instrument.flute': 'Flet',
  'instrument.ocarina': 'Okaryna',
  'instrument.harp': 'Harfa',
  'instrument.drums': 'Perkusja',
  'instrument.you': 'ty',
  'instrument.startsPlaying': '{name} zaczyna grać - {instrument}',
  'instrument.stopsPlaying': '{name} przestaje grać',
  'instrument.joinsBand': '{name} dołącza do zespołu gracza {master}',
  'instrument.leavesBand': '{name} opuszcza zespół',
  'instrument.fileError': 'Ten plik nie jest plikiem MIDI, który ten klient potrafi odtworzyć',
  'instrument.unavailable': 'Instrumenty są niedostępne na tym serwerze',
  'instrument.stopped.flood': 'Twój występ został przerwany: zbyt wiele nut naraz',
  'instrument.stopped.order': 'Twój występ został przerwany: nuty dotarły w złej kolejności',
  'instrument.stopped.gone': 'Muzyk odszedł',
  'instrument.refused.cooldown': 'Możesz znów zagrać za {seconds} s',
  'instrument.refused.busy': 'Już grasz lub należysz do zespołu',
  'instrument.refused.full': 'Zbyt wielu muzyków w tym miejscu',
  'instrument.refused.range': 'Za daleko od muzyka',
  'instrument.refused.map': 'Muzyk jest na innej mapie',
  'instrument.refused.notPerforming': 'Ten gracz nie gra',
  'instrument.refused.rate': 'Zwolnij',
} satisfies Partial<Record<keyof typeof en, string>>;
