/** el text of `versions/shared/ui/hud/chat`. */

import type en from './en';

export default {
  'chat.normal': 'Κανονικό',
  'chat.gens': 'Gens',
  'chat.blockWhisper': 'Φραγή ψιθύρων',
  'chat.system': 'Μηνύματα συστήματος',
  'chat.log': 'Ιστορικό συνομιλίας',
  'chat.frame': 'Πλαίσιο',
  'chat.size': 'Μέγεθος',
  'chat.alpha': 'Διαφάνεια',
  'chat.whisperOff': 'Οι ψίθυροι είναι ανενεργοί (F3)',
  'chat.emoji.button': 'Emoji',
  'chat.emoji.recent': 'Πρόσφατα',
  'chat.latest': 'Επιστροφή στα νεότερα μηνύματα',
} satisfies Partial<Record<keyof typeof en, string>>;
