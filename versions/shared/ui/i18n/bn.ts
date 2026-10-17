/** bn text of `versions/shared/ui`. */

import type en from './en';

export default {
  'servers.loading': 'সার্ভার তালিকা লোড হচ্ছে...',
  'servers.serverName': 'সার্ভার {number}',
  'login.id': 'ID',
  'login.password': 'পাসওয়ার্ড',
  'options.title': 'সেটিংস',
  'options.texturePack': 'মডেলের টেক্সচার',
  'options.texturePack.original': 'মূল',
  'options.texturePackHint': 'উচ্চ রেজোলিউশনের মডেল টেক্সচার, রিলোড ছাড়াই প্রয়োগ হয়',
  'session.toLevel': 'পরের লেভেল',
  'bottomBar.pet.normalTip': 'সাধারণ: দাঁড়কাক আপনার সাথে থাকে',
  'bottomBar.pet.randomTip': 'এলোমেলো: কাছের যেকোনো কিছুকে আক্রমণ করে',
  'bottomBar.pet.ownerTip': 'মালিক: আপনি যাকে আক্রমণ করেন তাকে আক্রমণ করে',
  'bottomBar.pet.targetTip': 'লক্ষ্য: আপনার বর্তমান লক্ষ্যকে আক্রমণ করে',
  'skills.title': 'স্কিল',
  'skills.empty': 'কোনো স্কিল শেখা হয়নি',
  'chatRoom.leave': 'ছেড়ে যান',
  'command.trade': 'লেনদেন',
  'command.purchase': 'কেনা',
  'command.party': 'পার্টি',
  'command.whisper': 'গোপন বার্তা',
  'command.follow': 'অনুসরণ',
  'command.battle': 'যুদ্ধ',
  'warp.title': 'স্থানান্তর কমান্ড উইন্ডো',
  'instrument.putAway': 'সরিয়ে রাখুন',
  'prompt.trade': 'লেনদেন',
} satisfies Partial<Record<keyof typeof en, string>>;
