/** Russian text of several windows, HUD elements and pages (no single owner). */

import type en from './en';

export default {
  'servers.loading': 'Загрузка списка серверов...',
  'servers.serverName': 'Сервер {number}',
  'login.id': 'ID',
  'login.password': 'Пароль',

  'options.title': 'Настройки',
  'options.texturePack': 'Текстуры моделей',
  'options.texturePack.original': 'Оригинальные',
  'options.texturePackHint': 'Текстуры моделей высокого разрешения, применяются без перезагрузки',
  'session.toLevel': 'До уровня',
  'bottomBar.pet.normalTip': 'Обычный: ворон остаётся рядом с вами',
  'bottomBar.pet.randomTip': 'Случайный: атакует всё, что рядом',
  'bottomBar.pet.ownerTip': 'Хозяин: атакует того, кого атакуете вы',
  'bottomBar.pet.targetTip': 'Цель: атакует вашу текущую цель',

  'skills.title': 'Умения',
  'skills.empty': 'Умения не изучены',
  'chatRoom.leave': 'Выйти',
  'command.trade': 'Обмен',
  'command.purchase': 'Купить',
  'command.party': 'Группа',
  'command.whisper': 'Шёпот',
  'command.follow': 'Следовать',
  'command.battle': 'Бой',
  'warp.title': 'Окно телепорта',
  'instrument.putAway': 'Убрать',
  'prompt.trade': 'Обмен',
} satisfies Partial<Record<keyof typeof en, string>>;
