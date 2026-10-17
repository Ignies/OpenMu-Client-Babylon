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
} satisfies Partial<Record<keyof typeof en, string>>;
