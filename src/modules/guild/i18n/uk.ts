/** uk text of `src/modules/guild`. */

import type en from './en';

export default {
  'guild.memberLeft': 'Гравець {name} покинув гільдію.',
  'guild.youLeft': 'Ви покинули гільдію.',
  'guild.disbanded': 'Гільдію розпущено.',
  'guild.memberRemoved': 'Учасника виключено з гільдії.',
  'guild.onlyMasterRemoves': 'Лише майстер гільдії може виключати учасників.',
  'guild.wrongPassword': 'Введено неправильний пароль.',
  'guild.created': 'Гільдію створено.',
  'guild.nameTaken': 'Ця назва гільдії вже зайнята.',
  'guild.createFailed': 'Не вдалося створити гільдію.',
  'guild.joinRefused': 'Майстер гільдії відхилив ваш запит.',
  'guild.joined': 'Ви вступили до гільдії.',
  'guild.isFull': 'Гільдію заповнено.',
  'guild.masterUnavailable': 'Майстер гільдії недоступний.',
  'guild.masterBusy': 'Майстер гільдії зайнятий. Спробуйте пізніше.',
  'guild.needLevel6': 'Щоб вступити до гільдії, потрібен рівень щонайменше 6.',
} satisfies Partial<Record<keyof typeof en, string>>;
