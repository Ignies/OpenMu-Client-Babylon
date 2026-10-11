/** Russian text of the `guild` module. */

import type en from './en';

export default {
  'guild.memberLeft': '{name} покинул guild.',
  'guild.youLeft': 'Вы покинули guild.',
  'guild.disbanded': 'Guild был распущен.',
  'guild.memberRemoved': 'Участник был исключён из guild.',
  'guild.onlyMasterRemoves':
    'Исключать участников может только мастер guild.',
  'guild.wrongPassword': 'Введённый пароль неверен.',
  'guild.created': 'Guild создан.',
  'guild.nameTaken': 'Это название guild уже занято.',
  'guild.createFailed': 'Guild не удалось создать.',
  'guild.joinRefused': 'Мастер guild отклонил ваш запрос.',
  'guild.joined': 'Вы вступили в guild.',
  'guild.isFull': 'Guild заполнен.',
  'guild.masterUnavailable': 'Мастер guild недоступен.',
  'guild.masterBusy': 'Мастер guild занят. Попробуйте позже.',
  'guild.needLevel6': 'Для вступления в guild нужен минимум 6-й уровень.',
} satisfies Partial<Record<keyof typeof en, string>>;
