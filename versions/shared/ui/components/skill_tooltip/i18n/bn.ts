/** bn text of `versions/shared/ui/components/skill_tooltip`. */

import type en from './en';

export default {
  'skills.tooltip.unknown': 'অজানা স্কিল',
  'skills.tooltip.class': 'আপনার ক্লাস এটি ব্যবহার করতে পারে না',
  'skills.tooltip.weapon': 'যে অস্ত্রে এই স্কিল আছে সেটি দরকার',
  'skills.tooltip.cooldown': 'এখনও প্রস্তুত নয়',
  'skills.tooltip.level': 'লেভেল {level} দরকার',
  'skills.tooltip.energy': 'এনার্জি {energy} দরকার',
  'skills.tooltip.mana': 'যথেষ্ট মানা নেই ({mana})',
  'skills.tooltip.ag': 'যথেষ্ট AG নেই ({ag})',
  'skills.tooltip.safezone': 'নিরাপদ এলাকায় ব্যবহার করা যায় না',
  'skills.unnamed': 'স্কিল #{number}',
  'skills.named': '{name} (লেভেল {level})',
  'skills.damage': 'স্কিল ক্ষতি +{value}',
  'skills.distance': 'দূরত্ব: {value}',
  'skills.mana': 'মানা: {value}',
  'skills.ag': 'AG: {value}',
  'skills.readyIn': '{seconds} সেকেন্ডে প্রস্তুত',
  'skills.delay': 'বিলম্ব: {seconds} সেকেন্ড',
} satisfies Partial<Record<keyof typeof en, string>>;
