/** Romanian text of the `auto_download` UI component. */

import type en from './en';

export default {
  'autoDownload.title': 'Se descarcă datele jocului',
  'autoDownload.done': 'Datele jocului au fost descărcate',
  'autoDownload.cancel': 'Anulează',
  'autoDownload.hide': 'Ascunde (descărcarea continuă)',
  'autoDownload.phase.map': 'Se încarcă harta: {name}',
  'autoDownload.phase.icons': 'Se încarcă obiectele',
  'autoDownload.phase.audio': 'Se încarcă muzica și sunetele',
  'autoDownload.phase.monsters': 'Se încarcă personajele și creaturile',
  'autoDownload.phase.core': 'Se încarcă interfața și efectele',
  'autoDownload.left': 'Mai sunt {left} MB',
  'autoDownload.received': '{got} MB descărcați din {total} MB',
  'autoDownload.screenTitle': 'Se pregătește aventura',
  'autoDownload.screenText': 'Aceste fișiere se păstrează ca următorul joc să se încarce mai repede. Doar prima dată.',
  'autoDownload.skip': 'Intră oricum',
  'autoDownload.skipNote': 'Descărcarea continuă în fundal. Dacă închizi jocul, reia de unde a rămas.',
} satisfies Partial<Record<keyof typeof en, string>>;
