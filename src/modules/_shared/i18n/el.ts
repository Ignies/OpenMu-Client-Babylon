/** el text of `src/modules/_shared`. */

import type en from './en';

export default {
  'personalShop.needLevel': 'Το προσωπικό κατάστημα απαιτεί χαρακτήρα επιπέδου 6.',
  'personalShop.openFailed': 'Δεν ήταν δυνατό το άνοιγμα του καταστήματος.',
  'personalShop.cannotSell': 'Αυτό το αντικείμενο δεν πωλείται σε κατάστημα.',
  'personalShop.itemGone': 'Αυτό το αντικείμενο δεν υπάρχει πια.',
  'guild.alreadyInGuild': 'Ανήκετε ήδη σε συντεχνία.',
  'guild.notGuildMaster': 'Αυτός ο παίκτης δεν είναι αρχηγός συντεχνίας.',
  'guild.requestFailed': 'Το αίτημα συντεχνίας απέτυχε.',
  'quest.itemFallback': 'Αντικείμενο {id}',
  'event.shortOfZen': 'Δεν έχετε αρκετά Zen.',
  'notify.negativePrice': 'Η τιμή δεν μπορεί να είναι αρνητική',
} satisfies Partial<Record<keyof typeof en, string>>;
