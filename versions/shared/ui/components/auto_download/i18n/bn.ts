/** bn text of `versions/shared/ui/components/auto_download`. */

import type en from './en';

export default {
  'autoDownload.title': 'গেমের ডেটা ডাউনলোড হচ্ছে',
  'autoDownload.done': 'গেমের ডেটা ডাউনলোড হয়েছে',
  'autoDownload.cancel': 'বাতিল',
  'autoDownload.hide': 'লুকান (ডাউনলোড চলতে থাকবে)',
  'autoDownload.phase.map': 'ম্যাপ লোড হচ্ছে: {name}',
  'autoDownload.phase.icons': 'আইটেম লোড হচ্ছে',
  'autoDownload.phase.audio': 'সংগীত ও শব্দ লোড হচ্ছে',
  'autoDownload.phase.monsters': 'চরিত্র ও প্রাণী লোড হচ্ছে',
  'autoDownload.phase.core': 'ইন্টারফেস ও ইফেক্ট লোড হচ্ছে',
  'autoDownload.left': 'বাকি {left} MB',
  'autoDownload.received': '{total} MB-এর মধ্যে {got} MB ডাউনলোড হয়েছে',
  'autoDownload.screenTitle': 'আপনার অভিযান প্রস্তুত হচ্ছে',
  'autoDownload.screenText': 'এই ফাইলগুলো রেখে দেওয়া হয় যাতে পরের গেম দ্রুত লোড হয়। শুধু প্রথমবার।',
  'autoDownload.skip': 'তবুও প্রবেশ করুন',
  'autoDownload.skipNote': 'ডাউনলোড পটভূমিতে চলতে থাকে। গেম বন্ধ করলে যেখানে থেমেছিল সেখান থেকে আবার শুরু হয়।',
} satisfies Partial<Record<keyof typeof en, string>>;
