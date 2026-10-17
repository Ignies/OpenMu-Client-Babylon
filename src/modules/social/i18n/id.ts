/** id text of `src/modules/social`. */

import type en from './en';

export default {
  'party.left': 'Kamu keluar dari party.',
  'party.onlyLeaderInvites': 'Hanya Ketua Party yang dapat mengundang.',
  'party.full': 'Party sudah penuh.',
  'party.invitationSent': 'Undangan party dikirim ke {name}.',
  'guild.joinRequestSent': 'Permintaan bergabung dengan guild dikirim ke {name}.',
  'guild.onlyMasterAppoints': 'Hanya Ketua Guild yang dapat mengangkat anggota.',
  'guild.onlyMasterCan': 'Hanya Ketua Guild yang dapat melakukannya.',
  'guild.allianceRequestSent': 'Permintaan aliansi dikirim ke {name}.',
  'guild.hostilityRequestSent': 'Pernyataan permusuhan dikirim ke {name}.',
} satisfies Partial<Record<keyof typeof en, string>>;
