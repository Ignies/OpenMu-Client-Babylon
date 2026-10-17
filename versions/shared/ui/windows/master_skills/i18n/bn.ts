/** bn text of `versions/shared/ui/windows/master_skills`. */

import type en from './en';

export default {
  'master.spendPoint': '{skill} স্কিলে {points} মাস্টার পয়েন্ট খরচ করবেন?',
  'master.spendPoints': '{skill} স্কিলে {points} মাস্টার পয়েন্ট খরচ করবেন?',
  'master.skillFallback': 'স্কিল {number}',
} satisfies Partial<Record<keyof typeof en, string>>;
