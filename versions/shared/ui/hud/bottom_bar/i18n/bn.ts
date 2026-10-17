/** bn text of `versions/shared/ui/hud/bottom_bar`. */

import type en from './en';

export default {
  'bottomBar.itemShop': 'আইটেম দোকান',
  'bottomBar.characterInfo': 'চরিত্রের তথ্য',
  'bottomBar.inventory': 'ইনভেন্টরি',
  'bottomBar.friendList': 'বন্ধু তালিকা',
  'bottomBar.noSkill': 'কোনো স্কিল নেই (রাইট ক্লিক = আক্রমণ)',
  'bottomBar.emptySlot': '[{key}] খালি',
  'bottomBar.itemSlot': '{name} [{key}]',
  'bottomBar.skillHint': ' - ক্লিক: স্কিল তালিকা, রাইট ক্লিক: সাধারণ আক্রমণ',
  'bottomBar.pickSkill': '[{key}] খালি - স্কিল বেছে নিতে ক্লিক করুন',
  'bottomBar.boundSlot': '{name} [{key}] - বদলাতে রাইট ক্লিক করুন',
  'bottomBar.clearSlot': '[{key}] ঘর খালি রাখুন',
  'bottomBar.pet.normal': 'সাধা',
  'bottomBar.pet.random': 'এলো',
  'bottomBar.pet.owner': 'মালিক',
  'bottomBar.pet.target': 'লক্ষ্য',
  'bottomBar.pet.needTarget': 'আগে দাঁড়কাকের জন্য একটি লক্ষ্য নির্বাচন করুন',
  'exp.title': 'অভিজ্ঞতা',
  'bottomBar.menu': 'মেনু',
} satisfies Partial<Record<keyof typeof en, string>>;
