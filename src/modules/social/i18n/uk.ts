/** uk text of `src/modules/social`. */

import type en from './en';

export default {
  'party.left': 'Ви вийшли з групи.',
  'party.onlyLeaderInvites': 'Запрошувати може лише лідер групи.',
  'party.full': 'Групу заповнено.',
  'party.invitationSent': 'Запрошення до групи надіслано гравцеві {name}.',
  'guild.joinRequestSent': 'Запит на вступ до гільдії надіслано гравцеві {name}.',
  'guild.onlyMasterAppoints': 'Лише майстер гільдії може призначати учасників.',
  'guild.onlyMasterCan': 'Це може зробити лише майстер гільдії.',
  'guild.allianceRequestSent': 'Запит на альянс надіслано гравцеві {name}.',
  'guild.hostilityRequestSent': 'Оголошення ворожнечі надіслано гравцеві {name}.',
  'party.reply.on': 'Запрошення до групи: вас питатимуть.',
  'party.reply.off': 'Запрошення до групи: відхиляються автоматично. /re on, щоб вас знову питали.',
  'party.reply.auto': 'Запрошення до групи: приймаються автоматично. /re on, щоб вас знову питали.',
  'party.reply.status':
    'Запрошення до групи: /re {mode}. Використовуйте /re on, /re off або /re auto.',
  'party.reply.declined': 'Запрошення до групи від гравця {name} відхилено (/re).',
  'party.reply.accepted': 'Запрошення до групи від гравця {name} прийнято (/re).',
} satisfies Partial<Record<keyof typeof en, string>>;
