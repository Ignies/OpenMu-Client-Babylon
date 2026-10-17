/** Polish text of the `auto_download` UI component. */

import type en from './en';

export default {
  'autoDownload.title': 'Pobieranie danych gry',
  'autoDownload.done': 'Dane gry pobrane',
  'autoDownload.cancel': 'Anuluj',
  'autoDownload.hide': 'Ukryj (pobieranie trwa dalej)',
  'autoDownload.phase.map': 'Wczytywanie mapy: {name}',
  'autoDownload.phase.icons': 'Wczytywanie przedmiotów',
  'autoDownload.phase.audio': 'Wczytywanie muzyki i dźwięków',
  'autoDownload.phase.monsters': 'Wczytywanie postaci i potworów',
  'autoDownload.phase.core': 'Wczytywanie interfejsu i efektów',
  'autoDownload.left': 'Zostało {left} MB',
  'autoDownload.received': 'Pobrano {got} MB z {total} MB',
  'autoDownload.screenTitle': 'Przygotowanie przygody',
  'autoDownload.screenText': 'Te pliki zostają zapisane, aby następna gra wczytała się szybciej. Tylko za pierwszym razem.',
  'autoDownload.skip': 'Wejdź mimo to',
  'autoDownload.skipNote': 'Pobieranie trwa w tle. Jeśli zamkniesz grę, wznowi się tam, gdzie przerwało.',
} satisfies Partial<Record<keyof typeof en, string>>;
