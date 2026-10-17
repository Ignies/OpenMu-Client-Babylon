/** uk text of `src/i18n/text`. */

import type en from './en';

export default {
  'common.ok': 'OK',
  'common.cancel': 'Скасувати',
  'common.close': 'Закрити',
  'common.none': 'Немає',
  'common.create': 'Створити',
  'common.creating': 'Створення...',
  'common.send': 'Надіслати',
  'common.sending': 'Надсилання...',
  'common.loading': 'Завантаження...',
  'common.warning': 'Увага',
  'common.level': 'Рівень',
  'common.offline': 'Не в мережі',
  'common.off': 'Вимк.',
  'common.zen': 'Zen',
  'common.notEnoughZen': 'Недостатньо Zen',
  'options.quality.classic': 'Класика',
  'options.quality.enhanced': 'Покращена',
} satisfies Partial<Record<keyof typeof en, string>>;
