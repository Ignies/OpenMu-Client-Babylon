/** tr text of `src/modules/social`. */

import type en from './en';

export default {
  'party.left': 'Gruptan ayrıldın.',
  'party.onlyLeaderInvites': 'Yalnızca grup lideri davet edebilir.',
  'party.full': 'Grup dolu.',
  'party.invitationSent': '{name} adlı oyuncuya grup daveti gönderildi.',
  'guild.joinRequestSent': '{name} adlı oyuncuya loncaya katılma isteği gönderildi.',
  'guild.onlyMasterAppoints': 'Üyeleri yalnızca lonca lideri atayabilir.',
  'guild.onlyMasterCan': 'Bunu yalnızca lonca lideri yapabilir.',
  'guild.allianceRequestSent': '{name} adlı oyuncuya ittifak isteği gönderildi.',
  'guild.hostilityRequestSent': '{name} adlı oyuncuya düşmanlık isteği gönderildi.',
  'party.reply.on': 'Grup davetleri: sana sorulacak.',
  'party.reply.off': 'Grup davetleri: kendiliğinden reddedilir. Yeniden sorulması için /re on.',
  'party.reply.auto': 'Grup davetleri: kendiliğinden kabul edilir. Yeniden sorulması için /re on.',
  'party.reply.status': 'Grup davetleri: /re {mode}. /re on, /re off veya /re auto kullan.',
  'party.reply.declined': '{name} adlı oyuncunun grup daveti reddedildi (/re).',
  'party.reply.accepted': '{name} adlı oyuncunun grup daveti kabul edildi (/re).',
  'stats.added': '{stat} niteliğine {amount} puan eklendi.',
  'stats.name.str': 'Güç',
  'stats.name.agi': 'Çeviklik',
  'stats.name.vit': 'Canlılık',
  'stats.name.ene': 'Enerji',
  'stats.name.cmd': 'Komuta',
} satisfies Partial<Record<keyof typeof en, string>>;
