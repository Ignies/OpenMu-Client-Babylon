/** tr text of `versions/shared/ui/hud/chat`. */

import type en from './en';

export default {
  'chat.normal': 'Normal',
  'chat.gens': 'Gens',
  'chat.blockWhisper': 'Fısıltıyı engelle',
  'chat.system': 'Sistem mesajları',
  'chat.log': 'Sohbet kaydı',
  'chat.frame': 'Çerçeve',
  'chat.size': 'Boyut',
  'chat.alpha': 'Saydamlık',
  'chat.whisperOff': 'Fısıltı kapalı (F3)',
  'chat.emoji.button': 'Emojiler',
  'chat.emoji.recent': 'Son kullanılanlar',
  'chat.latest': 'En yeni mesajlara dön',
} satisfies Partial<Record<keyof typeof en, string>>;
