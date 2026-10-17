/** hi text of `versions/shared/ui/windows/social_prompts`. */

import type en from './en';

export default {
  'social.partyInvite': '{name} ने आपको पार्टी में बुलाया है।',
  'social.guildJoin': 'खिलाड़ी {name} आपके गिल्ड में शामिल होना चाहता है।',
  'social.guildWar': '{name} ने आपके गिल्ड के विरुद्ध युद्ध की घोषणा की है।',
  'social.battleSoccer': '{name} ने आपके गिल्ड को Battle Soccer की चुनौती दी है।',
  'social.allianceOffer': '{name} ने गिल्ड गठबंधन का प्रस्ताव दिया है।',
  'social.allianceLeave': 'खिलाड़ी {name} गिल्ड गठबंधन छोड़ना चाहता है।',
  'social.hostilityDeclare': '{name} ने आपके गिल्डों के बीच शत्रुता घोषित की है।',
  'social.hostilityEnd': 'खिलाड़ी {name} शत्रुता खत्म करना चाहता है।',
  'social.friendRequest': 'खिलाड़ी {name} आपको दोस्त के रूप में जोड़ना चाहता है।',
} satisfies Partial<Record<keyof typeof en, string>>;
