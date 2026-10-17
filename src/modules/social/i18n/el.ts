/** el text of `src/modules/social`. */

import type en from './en';

export default {
  'party.left': 'Φύγατε από την ομάδα.',
  'party.onlyLeaderInvites': 'Μόνο ο αρχηγός της ομάδας μπορεί να προσκαλεί.',
  'party.full': 'Η ομάδα είναι γεμάτη.',
  'party.invitationSent': 'Η πρόσκληση ομάδας στάλθηκε στον παίκτη {name}.',
  'guild.joinRequestSent': 'Το αίτημα ένταξης στάλθηκε στον παίκτη {name}.',
  'guild.onlyMasterAppoints': 'Μόνο ο αρχηγός της συντεχνίας μπορεί να διορίζει μέλη.',
  'guild.onlyMasterCan': 'Μόνο ο αρχηγός της συντεχνίας μπορεί να το κάνει αυτό.',
  'guild.allianceRequestSent': 'Το αίτημα συμμαχίας στάλθηκε στον παίκτη {name}.',
  'guild.hostilityRequestSent': 'Η κήρυξη εχθρότητας στάλθηκε στον παίκτη {name}.',
} satisfies Partial<Record<keyof typeof en, string>>;
