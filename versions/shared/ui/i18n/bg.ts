/** Bulgarian text of several windows, HUD elements and pages (no single owner). */

import type en from './en';

export default {
  'servers.loading': 'Зарежда се списъкът със сървъри...',
  'servers.serverName': 'Сървър {number}',
  'login.id': 'ID',
  'login.password': 'Парола',

  'options.title': 'Настройки',
  'options.texturePack': 'Текстури на моделите',
  'options.texturePack.original': 'Оригинални',
  'options.texturePackHint': 'Текстури с по-висока резолюция, прилагат се без презареждане',
  'session.toLevel': 'До ниво',
  'bottomBar.pet.normalTip': 'Обикновено: гарванът стои до теб',
  'bottomBar.pet.randomTip': 'Случайно: напада всичко наблизо',
  'bottomBar.pet.ownerTip': 'Господар: напада това, което нападаш ти',
  'bottomBar.pet.targetTip': 'Цел: напада текущата ти цел',

  'skills.title': 'Умения',
  'skills.empty': 'Няма научени умения',
  'chatRoom.leave': 'Напусни',
  'command.trade': 'Размяна',
  'command.purchase': 'Купи',
  'command.party': 'Група',
  'command.whisper': 'Шепот',
  'command.follow': 'Следвай',
  'command.battle': 'Битка',
  'warp.title': 'Прозорец за телепорт',
  'instrument.putAway': 'Прибери',
  'prompt.trade': 'Размяна',
} satisfies Partial<Record<keyof typeof en, string>>;
