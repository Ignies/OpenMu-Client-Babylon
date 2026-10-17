/** fa text of `versions/shared/ui/windows/social_prompts`. */

import type en from './en';

export default {
  'social.partyInvite': 'بازیکن {name} شما را به گروه دعوت می‌کند.',
  'social.guildJoin': 'بازیکن {name} درخواست پیوستن به انجمن شما را دارد.',
  'social.guildWar': 'بازیکن {name} به انجمن شما اعلان جنگ می‌کند.',
  'social.battleSoccer': 'بازیکن {name} انجمن شما را به فوتبال نبرد فرا می‌خواند.',
  'social.allianceOffer': 'بازیکن {name} پیشنهاد اتحاد انجمن‌ها را می‌دهد.',
  'social.allianceLeave': 'بازیکن {name} می‌خواهد از اتحاد انجمن‌ها خارج شود.',
  'social.hostilityDeclare': 'بازیکن {name} انجمن‌های شما را دشمن اعلام می‌کند.',
  'social.hostilityEnd': 'بازیکن {name} می‌خواهد به دشمنی پایان دهد.',
  'social.friendRequest': 'بازیکن {name} می‌خواهد شما را به دوستانش بیفزاید.',
} satisfies Partial<Record<keyof typeof en, string>>;
