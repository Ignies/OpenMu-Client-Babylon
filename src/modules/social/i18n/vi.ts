/** Vietnamese text of the `social` module. */

import type en from './en';

export default {
  'party.left': 'Bạn đã rời tổ đội.',
  'party.onlyLeaderInvites': 'Chỉ đội trưởng mới có thể mời.',
  'party.full': 'Tổ đội đã đầy.',
  'party.invitationSent': 'Đã gửi lời mời vào tổ đội tới {name}.',
  'guild.joinRequestSent': 'Đã gửi yêu cầu gia nhập bang tới {name}.',
  'guild.onlyMasterAppoints': 'Chỉ bang chủ mới có thể bổ nhiệm thành viên.',
  'guild.onlyMasterCan': 'Chỉ bang chủ mới có thể làm việc đó.',
  'guild.allianceRequestSent': 'Đã gửi yêu cầu liên minh tới {name}.',
  'guild.hostilityRequestSent': 'Đã gửi tuyên bố thù địch tới {name}.',
} satisfies Partial<Record<keyof typeof en, string>>;
