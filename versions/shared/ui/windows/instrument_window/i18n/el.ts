/** el text of `versions/shared/ui/windows/instrument_window`. */

import type en from './en';

export default {
  'instrument.title': 'Όργανο',
  'instrument.load': 'Φόρτωση MIDI',
  'instrument.noFile': 'Δεν φορτώθηκε αρχείο',
  'instrument.loading': 'Φόρτωση οργάνου...',
  'instrument.play': 'Αναπαραγωγή',
  'instrument.pause': 'Παύση',
  'instrument.stop': 'Διακοπή',
  'instrument.loop': 'Επανάληψη',
  'instrument.channels': 'Κανάλια',
  'instrument.band': 'Μπάντα',
  'instrument.join': 'Συμμετοχή',
  'instrument.leave': 'Αποχώρηση',
  'instrument.nearby': 'Μουσικοί κοντά',
  'instrument.none': 'Κανείς δεν παίζει κοντά',
} satisfies Partial<Record<keyof typeof en, string>>;
