/** el text of `src/modules/personal_shop`. */

import type en from './en';

export default {
  'personalShop.disabled':
    'Τα προσωπικά καταστήματα είναι απενεργοποιημένα σε αυτόν τον διακομιστή.',
  'personalShop.slotNotInShop': 'Αυτή η θέση δεν ανήκει στο κατάστημα.',
  'personalShop.priceNotSet': 'Δεν ήταν δυνατός ο ορισμός της τιμής.',
} satisfies Partial<Record<keyof typeof en, string>>;
