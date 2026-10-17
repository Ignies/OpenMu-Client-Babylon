/** bn text of `versions/shared/ui/windows/duel`. */

import type en from './en';

export default {
  'duel.request': 'খেলোয়াড় {name} আপনাকে দ্বন্দ্বযুদ্ধে আহ্বান জানিয়েছেন।',
  'duel.wins': 'দ্বন্দ্বযুদ্ধের বিজয়ী {winner}, পরাজিত {loser}।',
  'duel.watchTitle': 'দ্বন্দ্বযুদ্ধের অবস্থা',
  'duel.channel': 'দ্বন্দ্বযুদ্ধ চ্যানেল {number}',
  'duel.emptyChannel': 'খালি চ্যানেল',
  'duel.join': 'দেখুন',
  'duel.vs': 'VS',
  'duel.leaveWatch': 'দ্বন্দ্বযুদ্ধ চ্যানেল ছেড়ে যান',
  'duel.stop': 'দ্বন্দ্বযুদ্ধ শেষ করুন',
} satisfies Partial<Record<keyof typeof en, string>>;
