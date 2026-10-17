/** fa text of `src/modules/social`. */

import type en from './en';

export default {
  'party.left': 'گروه را ترک کردید.',
  'party.onlyLeaderInvites': 'فقط رهبر گروه می‌تواند دعوت کند.',
  'party.full': 'گروه پر است.',
  'party.invitationSent': 'دعوت گروه برای بازیکن {name} فرستاده شد.',
  'party.reply.on': 'دعوت‌های گروه: از شما پرسیده می‌شود.',
  'party.reply.off': 'دعوت‌های گروه: خودکار رد می‌شوند. برای پرسیدن دوباره /re on.',
  'party.reply.auto': 'دعوت‌های گروه: خودکار پذیرفته می‌شوند. برای پرسیدن دوباره /re on.',
  'party.reply.status': 'دعوت‌های گروه: /re {mode}. از /re on، /re off یا /re auto استفاده کنید.',
  'party.reply.declined': 'دعوت گروه از بازیکن {name} رد شد (/re).',
  'party.reply.accepted': 'دعوت گروه از بازیکن {name} پذیرفته شد (/re).',
  'guild.joinRequestSent': 'درخواست عضویت انجمن برای بازیکن {name} فرستاده شد.',
  'guild.onlyMasterAppoints': 'فقط رئیس انجمن می‌تواند اعضا را منصوب کند.',
  'guild.onlyMasterCan': 'فقط رئیس انجمن می‌تواند این کار را بکند.',
  'guild.allianceRequestSent': 'درخواست اتحاد برای بازیکن {name} فرستاده شد.',
  'guild.hostilityRequestSent': 'درخواست دشمنی برای بازیکن {name} فرستاده شد.',
} satisfies Partial<Record<keyof typeof en, string>>;
