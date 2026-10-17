/** cs text of `versions/shared/ui/components/auto_download`. */

import type en from './en';

export default {
  'autoDownload.title': 'Stahování herních dat',
  'autoDownload.done': 'Herní data stažena',
  'autoDownload.cancel': 'Zrušit',
  'autoDownload.hide': 'Skrýt (stahování pokračuje)',
  'autoDownload.phase.map': 'Načítání mapy: {name}',
  'autoDownload.phase.icons': 'Načítání předmětů',
  'autoDownload.phase.audio': 'Načítání hudby a zvuků',
  'autoDownload.phase.monsters': 'Načítání postav a tvorů',
  'autoDownload.phase.core': 'Načítání rozhraní a efektů',
  'autoDownload.left': 'Zbývá {left} MB',
  'autoDownload.received': 'Staženo {got} MB z {total} MB',
  'autoDownload.screenTitle': 'Příprava tvého dobrodružství',
  'autoDownload.screenText': 'Tyto soubory se uchovají, aby se další hra načetla rychleji. Jen poprvé.',
  'autoDownload.skip': 'Přesto vstoupit',
  'autoDownload.skipNote': 'Stahování pokračuje na pozadí. Když hru zavřeš, naváže tam, kde skončilo.',
} satisfies Partial<Record<keyof typeof en, string>>;
