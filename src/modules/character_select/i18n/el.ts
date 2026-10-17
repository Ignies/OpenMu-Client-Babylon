/** el text of `src/modules/character_select`. */

import type en from './en';

export default {
  'characters.create.minLength': 'Πληκτρολογήστε περισσότερα από 4 γράμματα',
  'characters.create.specialName': 'Δεν επιτρέπονται σύμβολα.',
  'characters.create.reservedName': 'Αυτό το όνομα είναι δεσμευμένο.',
  'characters.create.failed': 'Εισαγάγατε λάθος όνομα χαρακτήρα ή το όνομα υπάρχει ήδη.',
} satisfies Partial<Record<keyof typeof en, string>>;
