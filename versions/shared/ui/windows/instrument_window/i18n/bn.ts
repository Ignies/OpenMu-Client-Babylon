/** bn text of `versions/shared/ui/windows/instrument_window`. */

import type en from './en';

export default {
  'instrument.title': 'বাদ্যযন্ত্র',
  'instrument.load': 'MIDI লোড করুন',
  'instrument.noFile': 'কোনো ফাইল লোড হয়নি',
  'instrument.loading': 'বাদ্যযন্ত্র লোড হচ্ছে...',
  'instrument.play': 'বাজান',
  'instrument.pause': 'বিরতি',
  'instrument.stop': 'থামান',
  'instrument.loop': 'পুনরাবৃত্তি',
  'instrument.channels': 'চ্যানেল',
  'instrument.band': 'ব্যান্ড',
  'instrument.join': 'যোগ দিন',
  'instrument.leave': 'ছেড়ে যান',
  'instrument.nearby': 'কাছের বাদক',
  'instrument.none': 'কাছাকাছি কেউ বাজাচ্ছেন না',
} satisfies Partial<Record<keyof typeof en, string>>;
