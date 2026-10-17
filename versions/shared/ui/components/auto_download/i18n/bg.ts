/** Bulgarian text of the `auto_download` UI component. */

import type en from './en';

export default {
  'autoDownload.title': 'Изтегляне на данните на играта',
  'autoDownload.done': 'Данните на играта са изтеглени',
  'autoDownload.cancel': 'Отказ',
  'autoDownload.hide': 'Скрий (изтеглянето продължава)',
  'autoDownload.phase.map': 'Зареждане на карта: {name}',
  'autoDownload.phase.icons': 'Зареждане на предмети',
  'autoDownload.phase.audio': 'Зареждане на музика и звуци',
  'autoDownload.phase.monsters': 'Зареждане на герои и същества',
  'autoDownload.phase.core': 'Зареждане на интерфейс и ефекти',
  'autoDownload.left': 'Остават {left} MB',
  'autoDownload.received': 'Изтеглени {got} MB от {total} MB',
  'autoDownload.screenTitle': 'Подготовка на приключението',
  'autoDownload.screenText': 'Тези файлове се пазят, за да се зарежда следващата игра по-бързо. Само първия път.',
  'autoDownload.skip': 'Влез все пак',
  'autoDownload.skipNote': 'Изтеглянето продължава във фонов режим. Ако затвориш играта, ще продължи оттам, докъдето е стигнало.',
} satisfies Partial<Record<keyof typeof en, string>>;
