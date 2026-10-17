/** bn text of `src/modules/band`. */

import type en from './en';

export default {
  'instrument.guitar': 'গিটার',
  'instrument.flute': 'বাঁশি',
  'instrument.ocarina': 'ওকারিনা',
  'instrument.harp': 'হার্প',
  'instrument.drums': 'ড্রাম',
  'instrument.you': 'আপনি',
  'instrument.startsPlaying': 'খেলোয়াড় {name} বাজাতে শুরু করেছেন: {instrument}',
  'instrument.stopsPlaying': 'খেলোয়াড় {name} বাজানো থামিয়েছেন',
  'instrument.joinsBand': 'খেলোয়াড় {name} ব্যান্ডে যোগ দিয়েছেন, দলনেতা: {master}',
  'instrument.leavesBand': 'খেলোয়াড় {name} ব্যান্ড ছেড়ে গেছেন',
  'instrument.fileError': 'এই ফাইলটি এমন MIDI ফাইল নয় যা এই ক্লায়েন্ট বাজাতে পারে',
  'instrument.unavailable': 'এই সার্ভারে বাদ্যযন্ত্র উপলব্ধ নয়',
  'instrument.stopped.flood': 'আপনার পরিবেশনা থামানো হয়েছে: একসাথে অনেক বেশি নোট',
  'instrument.stopped.order': 'আপনার পরিবেশনা থামানো হয়েছে: নোটগুলো ক্রম ভেঙে এসেছে',
  'instrument.stopped.gone': 'বাদক চলে গেছেন',
  'instrument.refused.cooldown': '{seconds} সেকেন্ড পরে আবার বাজাতে পারবেন',
  'instrument.refused.busy': 'আপনি ইতিমধ্যে বাজাচ্ছেন বা কোনো ব্যান্ডে আছেন',
  'instrument.refused.full': 'এখানে এখন অনেক বেশি বাদক',
  'instrument.refused.range': 'বাদক থেকে অনেক দূরে',
  'instrument.refused.map': 'বাদক অন্য ম্যাপে আছেন',
  'instrument.refused.notPerforming': 'ওই খেলোয়াড় বাজাচ্ছেন না',
  'instrument.refused.rate': 'একটু ধীরে',
} satisfies Partial<Record<keyof typeof en, string>>;
