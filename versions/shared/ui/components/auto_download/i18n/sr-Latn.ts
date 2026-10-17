/** sr-Latn text of `versions/shared/ui/components/auto_download`. */

import type en from './en';

export default {
  'autoDownload.title': 'Preuzimanje podataka igre',
  'autoDownload.done': 'Podaci igre su preuzeti',
  'autoDownload.cancel': 'Otkaži',
  'autoDownload.hide': 'Sakrij (preuzimanje se nastavlja)',
  'autoDownload.phase.map': 'Učitavanje mape: {name}',
  'autoDownload.phase.icons': 'Učitavanje predmeta',
  'autoDownload.phase.audio': 'Učitavanje muzike i zvukova',
  'autoDownload.phase.monsters': 'Učitavanje likova i stvorenja',
  'autoDownload.phase.core': 'Učitavanje interfejsa i efekata',
  'autoDownload.left': 'Preostalo {left} MB',
  'autoDownload.received': 'Preuzeto {got} MB od {total} MB',
  'autoDownload.screenTitle': 'Pripremamo tvoju avanturu',
  'autoDownload.screenText': 'Ove datoteke se čuvaju kako bi se sledeća igra brže učitala. Samo prvi put.',
  'autoDownload.skip': 'Ipak uđi',
  'autoDownload.skipNote': 'Preuzimanje se nastavlja u pozadini. Ako zatvoriš igru, nastaviće se tamo gde je stalo.',
} satisfies Partial<Record<keyof typeof en, string>>;
