/** bn text of `versions/shared/ui/windows/economy_prompts`. */

import type en from './en';

export default {
  'prompt.storeZen': 'Zen জমা দিন',
  'prompt.takeZen': 'Zen তুলুন',
  'prompt.unlockVault': 'ভান্ডার খুলুন',
  'prompt.enterPin': 'ভান্ডারের PIN লিখুন।',
  'prompt.setPin': 'ভান্ডারের PIN সেট করুন',
  'prompt.removePin': 'ভান্ডারের PIN সরান',
  'prompt.removePinHint': 'PIN সরাতে আপনার অ্যাকাউন্টের পাসওয়ার্ড লাগবে।',
  'prompt.offerZen': 'Zen প্রস্তাব',
  'prompt.setPrice': 'দাম ঠিক করুন',
  'prompt.askingPrice': 'চাওয়া দাম।',
  'prompt.askingPriceFor': 'চাওয়া দাম ({name})।',
  'prompt.buy': 'কিনুন',
  'prompt.itemCosts': '{name}: দাম {price}।',
  'prompt.thisItem': 'এই আইটেম',
  'prompt.itemGone': 'এই আইটেমটি আর নেই।',
  'prompt.buyHowMany': 'কতগুলো কিনবেন: {name}? প্রতিটি {price}।',
  'prompt.quantity': 'পরিমাণ',
  'prompt.carrying': 'আপনার কাছে আছে {amount}।',
  'prompt.vaultHolds': 'ভান্ডারে আছে {amount}।',
  'prompt.newPinHint': 'নতুন PIN-এর জন্য আপনার অ্যাকাউন্টের পাসওয়ার্ড লাগবে।',
  'prompt.pin': 'PIN',
  'prompt.password': 'পাসওয়ার্ড',
  'prompt.wantsToTrade': 'খেলোয়াড় {name} আপনার সাথে লেনদেন করতে চান।',
} satisfies Partial<Record<keyof typeof en, string>>;
