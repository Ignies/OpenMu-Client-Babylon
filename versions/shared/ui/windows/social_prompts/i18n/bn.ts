/** bn text of `versions/shared/ui/windows/social_prompts`. */

import type en from './en';

export default {
  'social.partyInvite': 'খেলোয়াড় {name} আপনাকে পার্টিতে আমন্ত্রণ জানিয়েছেন।',
  'social.guildJoin': 'খেলোয়াড় {name} আপনার গিল্ডে যোগ দিতে চান।',
  'social.guildWar': 'খেলোয়াড় {name} আপনার গিল্ডের বিরুদ্ধে যুদ্ধ ঘোষণা করেছেন।',
  'social.battleSoccer': 'খেলোয়াড় {name} আপনার গিল্ডকে Battle Soccer-এ আহ্বান জানিয়েছেন।',
  'social.allianceOffer': 'খেলোয়াড় {name} গিল্ড জোটের প্রস্তাব দিয়েছেন।',
  'social.allianceLeave': 'খেলোয়াড় {name} গিল্ড জোট ছাড়তে চান।',
  'social.hostilityDeclare': 'খেলোয়াড় {name} আপনাদের গিল্ডকে শত্রু ঘোষণা করেছেন।',
  'social.hostilityEnd': 'খেলোয়াড় {name} শত্রুতা শেষ করতে চান।',
  'social.friendRequest': 'খেলোয়াড় {name} আপনাকে বন্ধু হিসেবে যোগ করতে চান।',
} satisfies Partial<Record<keyof typeof en, string>>;
