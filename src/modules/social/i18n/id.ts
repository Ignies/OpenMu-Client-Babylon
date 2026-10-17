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
  'party.reply.on': 'Undangan party: kamu akan ditanya.',
  'party.reply.off': 'Undangan party: ditolak otomatis. /re on agar ditanya lagi.',
  'party.reply.auto': 'Undangan party: diterima otomatis. /re on agar ditanya lagi.',
  'party.reply.status': 'Undangan party: /re {mode}. Gunakan /re on, /re off, atau /re auto.',
  'party.reply.declined': 'Undangan party dari {name} ditolak (/re).',
  'party.reply.accepted': 'Undangan party dari {name} diterima (/re).',
  'stats.added': '{amount} poin ditambahkan ke {stat}.',
  'stats.name.str': 'Kekuatan',
  'stats.name.agi': 'Kelincahan',
  'stats.name.vit': 'Vitalitas',
  'stats.name.ene': 'Energi',
  'stats.name.cmd': 'Komando',
} satisfies Partial<Record<keyof typeof en, string>>;
