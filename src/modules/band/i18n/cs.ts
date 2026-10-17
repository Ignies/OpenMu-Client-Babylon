/** cs text of `src/modules/band`. */

import type en from './en';

export default {
  'instrument.guitar': 'Kytara',
  'instrument.flute': 'Flétna',
  'instrument.ocarina': 'Okarína',
  'instrument.harp': 'Harfa',
  'instrument.drums': 'Bicí',
  'instrument.you': 'ty',
  'instrument.startsPlaying': 'Hráč {name} začíná hrát na nástroj {instrument}',
  'instrument.stopsPlaying': 'Hráč {name} přestává hrát',
  'instrument.joinsBand': 'Hráč {name} se přidává ke kapele hráče {master}',
  'instrument.leavesBand': 'Hráč {name} opouští kapelu',
  'instrument.fileError': 'Tento soubor není soubor MIDI, který tento klient umí přehrát',
  'instrument.unavailable': 'Nástroje nejsou na tomto serveru k dispozici',
  'instrument.stopped.flood': 'Tvoje vystoupení bylo zastaveno: příliš mnoho not najednou',
  'instrument.stopped.order': 'Tvoje vystoupení bylo zastaveno: noty dorazily ve špatném pořadí',
  'instrument.stopped.gone': 'Hudebník odešel',
  'instrument.refused.cooldown': 'Znovu můžeš hrát za {seconds} s',
  'instrument.refused.busy': 'Už hraješ nebo jsi v kapele',
  'instrument.refused.full': 'Tady teď hraje příliš mnoho hudebníků',
  'instrument.refused.range': 'Jsi od hudebníka příliš daleko',
  'instrument.refused.map': 'Hudebník je na jiné mapě',
  'instrument.refused.notPerforming': 'Tento hráč nehraje',
  'instrument.refused.rate': 'Zpomal',
} satisfies Partial<Record<keyof typeof en, string>>;
