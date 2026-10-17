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
} satisfies Partial<Record<keyof typeof en, string>>;
