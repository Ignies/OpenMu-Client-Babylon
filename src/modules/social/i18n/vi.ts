/** Vietnamese text of the `social` module. */

import type en from './en';

export default {
  'party.left': 'Bạn đã rời tổ đội.',
  'party.onlyLeaderInvites': 'Chỉ đội trưởng mới có thể mời.',
  'party.full': 'Tổ đội đã đầy.',
  'party.invitationSent': 'Đã gửi lời mời vào tổ đội tới {name}.',
  'party.reply.on': 'Lời mời tổ đội: sẽ hỏi bạn.',
  'party.reply.off': 'Lời mời tổ đội: tự từ chối. Gõ /re on để được hỏi lại.',
  'party.reply.auto': 'Lời mời tổ đội: tự chấp nhận. Gõ /re on để được hỏi lại.',
  'party.reply.status': 'Lời mời tổ đội: /re {mode}. Dùng /re on, /re off hoặc /re auto.',
  'party.reply.declined': 'Đã từ chối lời mời tổ đội của {name} (/re).',
  'party.reply.accepted': 'Đã chấp nhận lời mời tổ đội của {name} (/re).',
  'guild.joinRequestSent': 'Đã gửi yêu cầu gia nhập bang tới {name}.',
  'guild.onlyMasterAppoints': 'Chỉ bang chủ mới có thể bổ nhiệm thành viên.',
  'guild.onlyMasterCan': 'Chỉ bang chủ mới có thể làm việc đó.',
  'guild.allianceRequestSent': 'Đã gửi yêu cầu liên minh tới {name}.',
  'guild.hostilityRequestSent': 'Đã gửi tuyên bố thù địch tới {name}.',
  'stats.added': 'Đã cộng {amount} điểm vào {stat}.',
  'stats.name.str': 'Sức mạnh',
  'stats.name.agi': 'Nhanh nhẹn',
  'stats.name.vit': 'Thể lực',
  'stats.name.ene': 'Năng lượng',
  'stats.name.cmd': 'Mệnh lệnh',
} satisfies Partial<Record<keyof typeof en, string>>;
