/** bn text of `versions/shared/ui/hud/chat`. */

import type en from './en';

export default {
  'chat.normal': 'সাধারণ',
  'chat.gens': 'Gens',
  'chat.blockWhisper': 'গোপন বার্তা ব্লক',
  'chat.system': 'সিস্টেম বার্তা',
  'chat.log': 'চ্যাট লগ',
  'chat.frame': 'ফ্রেম',
  'chat.size': 'আকার',
  'chat.alpha': 'স্বচ্ছতা',
  'chat.whisperOff': 'গোপন বার্তা বন্ধ (F3)',
  'chat.emoji.button': 'ইমোজি',
  'chat.emoji.recent': 'সম্প্রতি ব্যবহৃত',
  'chat.latest': 'নতুন বার্তায় ফিরে যান',
} satisfies Partial<Record<keyof typeof en, string>>;
