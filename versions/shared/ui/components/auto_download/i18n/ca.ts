/** ca text of `versions/shared/ui/components/auto_download`. */

import type en from './en';

export default {
  'autoDownload.title': 'Baixant les dades del joc',
  'autoDownload.done': 'Dades del joc baixades',
  'autoDownload.cancel': 'Cancel·la',
  'autoDownload.hide': 'Amaga (continua baixant)',
  'autoDownload.phase.map': 'Carregant el mapa: {name}',
  'autoDownload.phase.icons': 'Carregant els objectes',
  'autoDownload.phase.audio': 'Carregant la música i els sons',
  'autoDownload.phase.monsters': 'Carregant personatges i criatures',
  'autoDownload.phase.core': 'Carregant la interfície i els efectes',
  'autoDownload.left': 'Queden {left} MB',
  'autoDownload.received': '{got} MB baixats de {total} MB',
  'autoDownload.screenTitle': 'Preparant la teva aventura',
  'autoDownload.screenText': 'Aquests fitxers es conserven perquè la propera partida carregui més ràpid. Només la primera vegada.',
  'autoDownload.skip': 'Entra igualment',
  'autoDownload.skipNote': 'La baixada continua en segon pla. Si tanques el joc, es reprèn on s\'havia aturat.',
} satisfies Partial<Record<keyof typeof en, string>>;
