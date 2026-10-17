/** uk text of `versions/shared/ui`. */

import type en from './en';

export default {
  'servers.loading': 'Завантаження списку серверів...',
  'servers.serverName': 'Сервер {number}',
  'login.id': 'ID',
  'login.password': 'Пароль',
  'options.title': 'Налаштування',
  'options.texturePack': 'Текстури моделей',
  'options.texturePack.original': 'Оригінальні',
  'options.texturePackHint':
    'Текстури моделей вищої роздільності, застосовуються без перезавантаження',
  'session.toLevel': 'До рівня',
  'bottomBar.pet.normalTip': 'Звичайний: крук залишається біля вас',
  'bottomBar.pet.randomTip': 'Випадковий: атакує все поблизу',
  'bottomBar.pet.ownerTip': 'Власник: атакує те, що атакуєте ви',
  'bottomBar.pet.targetTip': 'Ціль: атакує вашу поточну ціль',
  'skills.title': 'Навички',
  'skills.empty': 'Навичок не вивчено',
  'chatRoom.leave': 'Вийти',
  'command.trade': 'Обмін',
  'command.purchase': 'Купити',
  'command.party': 'Група',
  'command.whisper': 'Шепіт',
  'command.follow': 'Слідувати',
  'command.battle': 'Бій',
  'warp.title': 'Вікно переміщення',
  'instrument.putAway': 'Прибрати',
  'prompt.trade': 'Обмін',
} satisfies Partial<Record<keyof typeof en, string>>;
