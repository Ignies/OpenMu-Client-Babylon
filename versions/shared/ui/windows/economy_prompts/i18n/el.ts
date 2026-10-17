/** el text of `versions/shared/ui/windows/economy_prompts`. */

import type en from './en';

export default {
  'prompt.storeZen': 'Κατάθεση Zen',
  'prompt.takeZen': 'Ανάληψη Zen',
  'prompt.unlockVault': 'Ξεκλείδωμα αποθήκης',
  'prompt.enterPin': 'Εισαγάγετε το PIN της αποθήκης.',
  'prompt.setPin': 'Ορισμός PIN αποθήκης',
  'prompt.removePin': 'Αφαίρεση PIN αποθήκης',
  'prompt.removePinHint': 'Η αφαίρεση του PIN απαιτεί τον κωδικό του λογαριασμού σας.',
  'prompt.offerZen': 'Προσφορά Zen',
  'prompt.setPrice': 'Ορισμός τιμής',
  'prompt.askingPrice': 'Ζητούμενη τιμή.',
  'prompt.askingPriceFor': 'Ζητούμενη τιμή: {name}.',
  'prompt.buy': 'Αγορά',
  'prompt.itemCosts': '{name} – τιμή: {price}.',
  'prompt.thisItem': 'Αυτό το αντικείμενο',
  'prompt.itemGone': 'Αυτό το αντικείμενο δεν υπάρχει πια.',
  'prompt.buyHowMany': '{name}: πόσα τεμάχια; {price} το ένα.',
  'prompt.quantity': 'Ποσότητα',
  'prompt.carrying': 'Έχετε μαζί σας {amount}.',
  'prompt.vaultHolds': 'Η αποθήκη περιέχει {amount}.',
  'prompt.newPinHint': 'Ένα νέο PIN απαιτεί τον κωδικό του λογαριασμού σας.',
  'prompt.pin': 'PIN',
  'prompt.password': 'Κωδικός',
  'prompt.wantsToTrade': 'Ο παίκτης {name} θέλει να κάνει ανταλλαγή μαζί σας.',
} satisfies Partial<Record<keyof typeof en, string>>;
