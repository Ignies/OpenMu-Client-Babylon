/** Polish text of the `social` module. */

import type en from './en';

export default {
  'party.left': 'Opuszczasz drużynę.',
  'party.onlyLeaderInvites': 'Tylko lider drużyny może zapraszać.',
  'party.full': 'Drużyna jest pełna.',
  'party.invitationSent': 'Wysłano zaproszenie do drużyny: {name}.',
  'guild.joinRequestSent': 'Wysłano prośbę o dołączenie do gildii: {name}.',
  'guild.onlyMasterAppoints': 'Tylko mistrz gildii może mianować członków.',
  'guild.onlyMasterCan': 'Tylko mistrz gildii może to zrobić.',
  'guild.allianceRequestSent': 'Wysłano propozycję sojuszu: {name}.',
  'guild.hostilityRequestSent': 'Wysłano wypowiedzenie wrogości: {name}.',
} satisfies Partial<Record<keyof typeof en, string>>;
