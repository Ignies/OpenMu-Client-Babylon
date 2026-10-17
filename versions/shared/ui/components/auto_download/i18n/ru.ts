/** Russian text of the `auto_download` UI component. */

import type en from './en';

export default {
  'autoDownload.title': 'Загрузка данных игры',
  'autoDownload.done': 'Данные игры загружены',
  'autoDownload.cancel': 'Отмена',
  'autoDownload.hide': 'Скрыть (загрузка продолжится)',
  'autoDownload.phase.map': 'Загрузка карты: {name}',
  'autoDownload.phase.icons': 'Загрузка предметов',
  'autoDownload.phase.audio': 'Загрузка музыки и звуков',
  'autoDownload.phase.monsters': 'Загрузка персонажей и существ',
  'autoDownload.phase.core': 'Загрузка интерфейса и эффектов',
  'autoDownload.left': 'Осталось {left} МБ',
  'autoDownload.received': 'Загружено {got} МБ из {total} МБ',
  'autoDownload.screenTitle': 'Подготовка приключения',
  'autoDownload.screenText': 'Эти файлы сохраняются, чтобы следующая игра загружалась быстрее. Только в первый раз.',
  'autoDownload.skip': 'Войти всё равно',
  'autoDownload.skipNote': 'Загрузка продолжится в фоне. Если закрыть игру, она продолжится с того места, где остановилась.',
} satisfies Partial<Record<keyof typeof en, string>>;
