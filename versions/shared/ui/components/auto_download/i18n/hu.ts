/** hu text of `versions/shared/ui/components/auto_download`. */

import type en from './en';

export default {
  'autoDownload.title': 'Játékadatok letöltése',
  'autoDownload.done': 'Játékadatok letöltve',
  'autoDownload.cancel': 'Mégse',
  'autoDownload.hide': 'Elrejtés (a letöltés folytatódik)',
  'autoDownload.phase.map': 'Térkép betöltése: {name}',
  'autoDownload.phase.icons': 'Tárgyak betöltése',
  'autoDownload.phase.audio': 'Zene és hangok betöltése',
  'autoDownload.phase.monsters': 'Karakterek és lények betöltése',
  'autoDownload.phase.core': 'Felület és effektek betöltése',
  'autoDownload.left': 'Még {left} MB',
  'autoDownload.received': '{got} MB letöltve ennyiből: {total} MB',
  'autoDownload.screenTitle': 'A kalandod előkészítése',
  'autoDownload.screenText': 'Ezeket a fájlokat megőrizzük, hogy a következő játék gyorsabban betöltsön. Csak az első alkalommal.',
  'autoDownload.skip': 'Belépés mégis',
  'autoDownload.skipNote': 'A letöltés a háttérben folytatódik. Ha bezárod a játékot, ott folytatja, ahol abbamaradt.',
} satisfies Partial<Record<keyof typeof en, string>>;
