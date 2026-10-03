/** Russian text of no single owner: shared by many (`common.*`, language names). */

import type en from './en';

export default {
  'common.ok': 'ОК',
  'common.cancel': 'Отмена',
  'common.close': 'Закрыть',
  'common.none': 'Нет',
  'common.create': 'Создать',
  'common.creating': 'Создание...',
  'common.send': 'Отправить',
  'common.sending': 'Отправка...',
  'common.loading': 'Загрузка...',
  'common.warning': 'Внимание',
  'common.level': 'Уровень',
  'common.offline': 'Не в сети',
  'common.off': 'Выкл.',
  'common.zen': 'Zen',
  'common.notEnoughZen': 'Недостаточно Zen',
  'options.quality.classic': 'Классика',
  'options.quality.enhanced': 'Улучшенное',
} satisfies Partial<Record<keyof typeof en, string>>;
