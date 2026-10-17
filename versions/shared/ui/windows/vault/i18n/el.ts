/** el text of `versions/shared/ui/windows/vault`. */

import type en from './en';

export default {
  'vault.depositJewels': 'Πετράδια',
  'vault.depositJewelsHint': 'Μεταφορά όλων των πετραδιών από το σακίδιο στην αποθήκη',
  'vault.title': 'Αποθήκη',
  'vault.unlocked': 'Ξεκλείδωτη',
  'vault.locked': 'Κλειδωμένη',
  'vault.fee': 'Χρέωση',
  'vault.deposit': 'Κατάθεση Zen',
  'vault.withdraw': 'Ανάληψη Zen',
  'vault.pin': 'PIN αποθήκης',
} satisfies Partial<Record<keyof typeof en, string>>;
