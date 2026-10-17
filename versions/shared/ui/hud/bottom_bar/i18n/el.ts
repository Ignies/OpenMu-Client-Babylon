/** el text of `versions/shared/ui/hud/bottom_bar`. */

import type en from './en';

export default {
  'bottomBar.itemShop': 'Κατάστημα',
  'bottomBar.characterInfo': 'Πληροφορίες χαρακτήρα',
  'bottomBar.inventory': 'Σακίδιο',
  'bottomBar.friendList': 'Λίστα φίλων',
  'bottomBar.noSkill': 'Χωρίς δεξιότητα (δεξί κλικ = επίθεση)',
  'bottomBar.emptySlot': '[{key}] κενό',
  'bottomBar.itemSlot': '{name} [{key}]',
  'bottomBar.skillHint': ' – κλικ: λίστα δεξιοτήτων, δεξί κλικ: απλή επίθεση',
  'bottomBar.pickSkill': '[{key}] κενό – κάντε κλικ για να επιλέξετε δεξιότητα',
  'bottomBar.boundSlot': '{name} [{key}] – δεξί κλικ για αλλαγή',
  'bottomBar.clearSlot': 'Άδειασμα θέσης [{key}]',
  'bottomBar.pet.normal': 'Καν',
  'bottomBar.pet.random': 'Τυχ',
  'bottomBar.pet.owner': 'Κατ',
  'bottomBar.pet.target': 'Στχ',
  'bottomBar.pet.needTarget': 'Επιλέξτε πρώτα έναν στόχο για το κοράκι',
  'exp.title': 'Εμπειρία',
  'bottomBar.menu': 'Μενού',
} satisfies Partial<Record<keyof typeof en, string>>;
