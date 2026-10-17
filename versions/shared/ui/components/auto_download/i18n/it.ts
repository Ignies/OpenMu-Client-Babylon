/** Italian text of the `auto_download` UI component. */

import type en from './en';

export default {
  'autoDownload.title': 'Download dei dati di gioco',
  'autoDownload.done': 'Dati di gioco scaricati',
  'autoDownload.cancel': 'Annulla',
  'autoDownload.hide': 'Nascondi (continua a scaricare)',
  'autoDownload.phase.map': 'Caricamento mappa: {name}',
  'autoDownload.phase.icons': 'Caricamento oggetti',
  'autoDownload.phase.audio': 'Caricamento musica e suoni',
  'autoDownload.phase.monsters': 'Caricamento personaggi e creature',
  'autoDownload.phase.core': 'Caricamento interfaccia ed effetti',
  'autoDownload.left': 'Mancano {left} MB',
  'autoDownload.received': '{got} MB scaricati su {total} MB',
  'autoDownload.screenTitle': "Preparazione dell'avventura",
  'autoDownload.screenText': 'Questi file vengono conservati perché la prossima partita si carichi più in fretta. Solo la prima volta.',
  'autoDownload.skip': 'Entra comunque',
  'autoDownload.skipNote': 'Il download continua in sottofondo. Se chiudi il gioco, riprende da dove si era fermato.',
} satisfies Partial<Record<keyof typeof en, string>>;
