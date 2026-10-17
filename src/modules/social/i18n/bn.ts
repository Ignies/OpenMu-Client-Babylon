/** bn text of `src/modules/social`. */

import type en from './en';

export default {
  'party.left': 'আপনি পার্টি ছেড়েছেন।',
  'party.onlyLeaderInvites': 'শুধু পার্টি প্রধান আমন্ত্রণ জানাতে পারেন।',
  'party.full': 'পার্টি পূর্ণ।',
  'party.invitationSent': 'পার্টির আমন্ত্রণ পাঠানো হয়েছে: {name}।',
  'guild.joinRequestSent': 'গিল্ডে যোগদানের অনুরোধ পাঠানো হয়েছে: {name}।',
  'guild.onlyMasterAppoints': 'শুধু গিল্ড মাস্টার সদস্যদের নিয়োগ দিতে পারেন।',
  'guild.onlyMasterCan': 'শুধু গিল্ড মাস্টার এটি করতে পারেন।',
  'guild.allianceRequestSent': 'জোটের অনুরোধ পাঠানো হয়েছে: {name}।',
  'guild.hostilityRequestSent': 'শত্রুতার ঘোষণা পাঠানো হয়েছে: {name}।',
  'party.reply.on': 'পার্টির আমন্ত্রণ: আপনাকে জিজ্ঞাসা করা হবে।',
  'party.reply.off': 'পার্টির আমন্ত্রণ: নিজে থেকেই প্রত্যাখ্যাত হবে। আবার জিজ্ঞাসা পেতে /re on।',
  'party.reply.auto': 'পার্টির আমন্ত্রণ: নিজে থেকেই গৃহীত হবে। আবার জিজ্ঞাসা পেতে /re on।',
  'party.reply.status': 'পার্টির আমন্ত্রণ: /re {mode}। /re on, /re off বা /re auto ব্যবহার করুন।',
  'party.reply.declined': 'পার্টির আমন্ত্রণ প্রত্যাখ্যাত, প্রেরক খেলোয়াড় {name} (/re)।',
  'party.reply.accepted': 'পার্টির আমন্ত্রণ গৃহীত, প্রেরক খেলোয়াড় {name} (/re)।',
  'stats.added': '{stat} স্ট্যাটে {amount} পয়েন্ট যোগ হয়েছে।',
  'stats.name.str': 'শক্তি',
  'stats.name.agi': 'ক্ষিপ্রতা',
  'stats.name.vit': 'প্রাণশক্তি',
  'stats.name.ene': 'এনার্জি',
  'stats.name.cmd': 'নেতৃত্ব',
} satisfies Partial<Record<keyof typeof en, string>>;
