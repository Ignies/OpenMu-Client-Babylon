/** French text of the `social` module. */

import type en from './en';

export default {
  'party.left': 'Vous avez quitté le groupe.',
  'party.onlyLeaderInvites': 'Seul le chef du groupe peut inviter.',
  'party.full': 'Le groupe est complet.',
  'party.invitationSent': 'Invitation de groupe envoyée à {name}.',
  'guild.joinRequestSent': 'Demande de guilde envoyée à {name}.',
  'guild.onlyMasterAppoints':
    'Seul le maître de guilde peut nommer des membres.',
  'guild.onlyMasterCan': 'Seul le maître de guilde peut faire cela.',
  'guild.allianceRequestSent': 'Demande d’alliance envoyée à {name}.',
  'guild.hostilityRequestSent': 'Déclaration de rivalité envoyée à {name}.',
} satisfies Partial<Record<keyof typeof en, string>>;
