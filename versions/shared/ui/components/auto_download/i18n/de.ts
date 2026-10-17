/** German text of the `auto_download` UI component. */

import type en from './en';

export default {
  'autoDownload.title': 'Spieldaten werden geladen',
  'autoDownload.done': 'Spieldaten geladen',
  'autoDownload.cancel': 'Abbrechen',
  'autoDownload.hide': 'Ausblenden (lädt weiter)',
  'autoDownload.phase.map': 'Lade Karte: {name}',
  'autoDownload.phase.icons': 'Lade Gegenstände',
  'autoDownload.phase.audio': 'Lade Musik und Klänge',
  'autoDownload.phase.monsters': 'Lade Figuren und Kreaturen',
  'autoDownload.phase.core': 'Lade Oberfläche und Effekte',
  'autoDownload.left': 'Noch {left} MB',
  'autoDownload.received': '{got} MB von {total} MB geladen',
  'autoDownload.screenTitle': 'Dein Abenteuer wird vorbereitet',
  'autoDownload.screenText': 'Diese Dateien werden behalten, damit dein nächstes Spiel schneller lädt. Nur beim ersten Mal.',
  'autoDownload.skip': 'Trotzdem betreten',
  'autoDownload.skipNote': 'Der Download läuft im Hintergrund weiter. Schließt du das Spiel, geht er dort weiter, wo er aufgehört hat.',
} satisfies Partial<Record<keyof typeof en, string>>;
