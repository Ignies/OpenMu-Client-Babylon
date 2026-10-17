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
  'party.reply.on': 'Προσκλήσεις ομάδας: θα ερωτάστε.',
  'party.reply.off': 'Προσκλήσεις ομάδας: απορρίπτονται αυτόματα. /re on για να ερωτάστε ξανά.',
  'party.reply.auto': 'Προσκλήσεις ομάδας: γίνονται δεκτές αυτόματα. /re on για να ερωτάστε ξανά.',
  'party.reply.status':
    'Προσκλήσεις ομάδας: /re {mode}. Χρησιμοποιήστε /re on, /re off ή /re auto.',
  'party.reply.declined': 'Η πρόσκληση ομάδας από τον παίκτη {name} απορρίφθηκε (/re).',
  'party.reply.accepted': 'Η πρόσκληση ομάδας από τον παίκτη {name} έγινε δεκτή (/re).',
  'stats.added': 'Προστέθηκαν πόντοι ({amount}) στο χαρακτηριστικό {stat}.',
  'stats.name.str': 'Δύναμη',
  'stats.name.agi': 'Ευκινησία',
  'stats.name.vit': 'Ζωτικότητα',
  'stats.name.ene': 'Ενέργεια',
  'stats.name.cmd': 'Διοίκηση',
} satisfies Partial<Record<keyof typeof en, string>>;
