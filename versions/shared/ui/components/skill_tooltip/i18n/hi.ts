/** hi text of `versions/shared/ui/components/skill_tooltip`. */

import type en from './en';

export default {
  'skills.tooltip.unknown': 'अज्ञात स्किल',
  'skills.tooltip.class': 'आपका वर्ग इसे इस्तेमाल नहीं कर सकता',
  'skills.tooltip.weapon': 'इसके लिए वह हथियार चाहिए जो यह स्किल देता है',
  'skills.tooltip.cooldown': 'अभी तैयार नहीं',
  'skills.tooltip.level': 'लेवल {level} चाहिए',
  'skills.tooltip.energy': 'ऊर्जा {energy} चाहिए',
  'skills.tooltip.mana': 'पर्याप्त माना नहीं ({mana})',
  'skills.tooltip.ag': 'पर्याप्त AG नहीं ({ag})',
  'skills.tooltip.safezone': 'सुरक्षित क्षेत्र में इस्तेमाल नहीं हो सकती',
  'skills.unnamed': 'स्किल #{number}',
  'skills.named': '{name} (लेवल {level})',
  'skills.damage': 'स्किल नुकसान +{value}',
  'skills.distance': 'दूरी: {value}',
  'skills.mana': 'माना: {value}',
  'skills.ag': 'AG: {value}',
  'skills.readyIn': '{seconds} सेकंड में तैयार',
  'skills.delay': 'देरी: {seconds} सेकंड',
} satisfies Partial<Record<keyof typeof en, string>>;
