/** fil text of `versions/shared/ui/components/auto_download`. */

import type en from './en';

export default {
  'autoDownload.title': 'Dina-download ang data ng laro',
  'autoDownload.done': 'Na-download na ang data ng laro',
  'autoDownload.cancel': 'Kanselahin',
  'autoDownload.hide': 'Itago (tuloy ang pag-download)',
  'autoDownload.phase.map': 'Nilo-load ang mapa: {name}',
  'autoDownload.phase.icons': 'Nilo-load ang mga item',
  'autoDownload.phase.audio': 'Nilo-load ang musika at mga tunog',
  'autoDownload.phase.monsters': 'Nilo-load ang mga karakter at nilalang',
  'autoDownload.phase.core': 'Nilo-load ang interface at mga effect',
  'autoDownload.left': '{left} MB pa ang natitira',
  'autoDownload.received': '{got} MB ang na-download sa {total} MB',
  'autoDownload.screenTitle': 'Inihahanda ang iyong pakikipagsapalaran',
  'autoDownload.screenText': 'Itinatabi ang mga file na ito para mas mabilis mag-load ang susunod mong laro. Sa unang beses lang.',
  'autoDownload.skip': 'Pumasok pa rin',
  'autoDownload.skipNote': 'Tuloy ang pag-download sa background. Kapag isinara mo ang laro, itutuloy ito kung saan ito huminto.',
} satisfies Partial<Record<keyof typeof en, string>>;
