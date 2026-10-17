/** hu text of `src/modules/band`. */

import type en from './en';

export default {
  'instrument.guitar': 'Gitár',
  'instrument.flute': 'Furulya',
  'instrument.ocarina': 'Okarina',
  'instrument.harp': 'Hárfa',
  'instrument.drums': 'Dob',
  'instrument.you': 'te',
  'instrument.startsPlaying': '{name} rázendít a hangszerére: {instrument}',
  'instrument.stopsPlaying': '{name} abbahagyja a zenélést',
  'instrument.joinsBand': '{name} csatlakozik {master} zenekarához',
  'instrument.leavesBand': '{name} kilép a zenekarból',
  'instrument.fileError': 'Ez a fájl nem olyan MIDI fájl, amelyet ez a kliens le tud játszani',
  'instrument.unavailable': 'Ezen a szerveren nem érhetők el hangszerek',
  'instrument.stopped.flood': 'Az előadásodat leállították: túl sok hangjegy egyszerre',
  'instrument.stopped.order': 'Az előadásodat leállították: a hangjegyek rossz sorrendben érkeztek',
  'instrument.stopped.gone': 'Az előadó már nincs itt',
  'instrument.refused.cooldown': '{seconds} mp múlva játszhatsz újra',
  'instrument.refused.busy': 'Már játszol, vagy egy zenekar tagja vagy',
  'instrument.refused.full': 'Túl sok előadó van most itt',
  'instrument.refused.range': 'Túl messze vagy az előadótól',
  'instrument.refused.map': 'Az előadó másik térképen van',
  'instrument.refused.notPerforming': 'Ez a játékos nem ad elő',
  'instrument.refused.rate': 'Lassabban',
} satisfies Partial<Record<keyof typeof en, string>>;
