/** eu text of `src/modules/band`. */

import type en from './en';

export default {
  'instrument.guitar': 'Gitarra',
  'instrument.flute': 'Txirula',
  'instrument.ocarina': 'Okarina',
  'instrument.harp': 'Harpa',
  'instrument.drums': 'Bateria',
  'instrument.you': 'zu',
  'instrument.startsPlaying': '{name} jokalaria jotzen hasi da: {instrument}',
  'instrument.stopsPlaying': '{name} jokalariak jotzeari utzi dio',
  'instrument.joinsBand': '{name} jokalaria {master} jokalariaren bandara batu da',
  'instrument.leavesBand': '{name} jokalariak banda utzi du',
  'instrument.fileError': 'Fitxategi hori ez da bezero honek jo dezakeen MIDI fitxategia',
  'instrument.unavailable': 'Instrumentuak ez daude erabilgarri zerbitzari honetan',
  'instrument.stopped.flood': 'Zure emanaldia gelditu da: nota gehiegi batera',
  'instrument.stopped.order': 'Zure emanaldia gelditu da: notak ordenaz kanpo iritsi dira',
  'instrument.stopped.gone': 'Musikaria joan egin da',
  'instrument.refused.cooldown': 'Berriro jo dezakezu {seconds} s barru',
  'instrument.refused.busy': 'Dagoeneko jotzen ari zara edo banda batean zaude',
  'instrument.refused.full': 'Musikari gehiegi daude hemen une honetan',
  'instrument.refused.range': 'Musikaritik urrunegi zaude',
  'instrument.refused.map': 'Musikaria beste mapa batean dago',
  'instrument.refused.notPerforming': 'Jokalari hori ez dago jotzen',
  'instrument.refused.rate': 'Motelago, mesedez',
} satisfies Partial<Record<keyof typeof en, string>>;
