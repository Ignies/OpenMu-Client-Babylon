/** Polish text of the `social` module. */

import type en from './en';

export default {
  'party.left': 'Opuszczasz drużynę.',
  'party.onlyLeaderInvites': 'Tylko lider drużyny może zapraszać.',
  'party.full': 'Drużyna jest pełna.',
  'party.invitationSent': 'Wysłano zaproszenie do drużyny: {name}.',
  'party.reply.on': 'Zaproszenia do drużyny: zostaniesz zapytany.',
  'party.reply.off': 'Zaproszenia do drużyny: odrzucane same. /re on, aby znów być pytanym.',
  'party.reply.auto': 'Zaproszenia do drużyny: przyjmowane same. /re on, aby znów być pytanym.',
  'party.reply.status': 'Zaproszenia do drużyny: /re {mode}. Użyj /re on, /re off lub /re auto.',
  'party.reply.declined': 'Odrzucono zaproszenie do drużyny od {name} (/re).',
  'party.reply.accepted': 'Przyjęto zaproszenie do drużyny od {name} (/re).',
  'guild.joinRequestSent': 'Wysłano prośbę o dołączenie do gildii: {name}.',
  'guild.onlyMasterAppoints': 'Tylko mistrz gildii może mianować członków.',
  'guild.onlyMasterCan': 'Tylko mistrz gildii może to zrobić.',
  'guild.allianceRequestSent': 'Wysłano propozycję sojuszu: {name}.',
  'guild.hostilityRequestSent': 'Wysłano wypowiedzenie wrogości: {name}.',
} satisfies Partial<Record<keyof typeof en, string>>;
