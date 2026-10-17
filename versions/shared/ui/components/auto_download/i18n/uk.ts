/** uk text of `versions/shared/ui/components/auto_download`. */

import type en from './en';

export default {
  'autoDownload.title': 'Завантаження даних гри',
  'autoDownload.done': 'Дані гри завантажено',
  'autoDownload.cancel': 'Скасувати',
  'autoDownload.hide': 'Сховати (завантаження триває)',
  'autoDownload.phase.map': 'Завантаження мапи: {name}',
  'autoDownload.phase.icons': 'Завантаження предметів',
  'autoDownload.phase.audio': 'Завантаження музики та звуків',
  'autoDownload.phase.monsters': 'Завантаження персонажів та істот',
  'autoDownload.phase.core': 'Завантаження інтерфейсу та ефектів',
  'autoDownload.left': 'Залишилося {left} МБ',
  'autoDownload.received': 'Завантажено {got} МБ з {total} МБ',
  'autoDownload.screenTitle': 'Підготовка вашої пригоди',
  'autoDownload.screenText': 'Ці файли зберігаються, щоб наступна гра завантажувалася швидше. Лише першого разу.',
  'autoDownload.skip': 'Увійти все одно',
  'autoDownload.skipNote': 'Завантаження триває у фоні. Якщо закрити гру, воно продовжиться з того місця, де зупинилося.',
} satisfies Partial<Record<keyof typeof en, string>>;
