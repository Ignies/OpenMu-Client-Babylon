/** Polish text of the `trade` window. */

import type en from './en';

export default {
  'trade.title': 'Handel',
  'trade.warnCheck': 'Sprawdź każdy przedmiot, zanim zaakceptujesz.',
  'trade.warnAlike': 'Przedmioty mogą wyglądać podobnie, a jednak się różnić.',
  'trade.warnCancel': 'Anulowany handel zwraca wszystko.',
  'trade.cancel': 'Anuluj handel',
  'trade.offerZen': 'Zaoferuj Zen',
  'trade.accept': 'Akceptuj handel',
} satisfies Partial<Record<keyof typeof en, string>>;
