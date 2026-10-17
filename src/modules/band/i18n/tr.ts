/** tr text of `src/modules/band`. */

import type en from './en';

export default {
  'instrument.guitar': 'Gitar',
  'instrument.flute': 'Flüt',
  'instrument.ocarina': 'Okarina',
  'instrument.harp': 'Arp',
  'instrument.drums': 'Davul',
  'instrument.you': 'sen',
  'instrument.startsPlaying': '{name} adlı oyuncu çalmaya başladı: {instrument}',
  'instrument.stopsPlaying': '{name} adlı oyuncu çalmayı bıraktı',
  'instrument.joinsBand': '{name} adlı oyuncu, {master} adlı oyuncunun orkestrasına katıldı',
  'instrument.leavesBand': '{name} adlı oyuncu orkestradan ayrıldı',
  'instrument.fileError': 'Bu dosya, bu istemcinin çalabileceği bir MIDI dosyası değil',
  'instrument.unavailable': 'Bu sunucuda enstrümanlar kullanılamıyor',
  'instrument.stopped.flood': 'Performansın durduruldu: aynı anda çok fazla nota',
  'instrument.stopped.order': 'Performansın durduruldu: notalar sırasız geldi',
  'instrument.stopped.gone': 'Müzisyen gitti',
  'instrument.refused.cooldown': '{seconds} sn sonra yeniden çalabilirsin',
  'instrument.refused.busy': 'Zaten çalıyorsun ya da bir orkestradasın',
  'instrument.refused.full': 'Şu anda burada çok fazla müzisyen var',
  'instrument.refused.range': 'Müzisyene çok uzaksın',
  'instrument.refused.map': 'Müzisyen başka bir haritada',
  'instrument.refused.notPerforming': 'Bu oyuncu çalmıyor',
  'instrument.refused.rate': 'Yavaşla',
} satisfies Partial<Record<keyof typeof en, string>>;
