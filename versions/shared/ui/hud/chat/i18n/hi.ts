/** hi text of `versions/shared/ui/hud/chat`. */

import type en from './en';

export default {
  'chat.normal': 'सामान्य',
  'chat.gens': 'Gens',
  'chat.blockWhisper': 'कानाफूसी ब्लॉक करें',
  'chat.system': 'सिस्टम संदेश',
  'chat.log': 'चैट लॉग',
  'chat.frame': 'फ़्रेम',
  'chat.size': 'आकार',
  'chat.alpha': 'पारदर्शिता',
  'chat.whisperOff': 'कानाफूसी बंद है (F3)',
  'chat.emoji.button': 'इमोजी',
  'chat.emoji.recent': 'हाल में इस्तेमाल',
  'chat.latest': 'नए संदेशों पर वापस जाएं',
} satisfies Partial<Record<keyof typeof en, string>>;
