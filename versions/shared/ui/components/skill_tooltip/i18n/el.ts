/** el text of `versions/shared/ui/components/skill_tooltip`. */

import type en from './en';

export default {
  'skills.tooltip.unknown': 'Άγνωστη δεξιότητα',
  'skills.tooltip.class': 'Η κλάση σας δεν μπορεί να τη χρησιμοποιήσει',
  'skills.tooltip.weapon': 'Απαιτεί το όπλο που τη φέρει',
  'skills.tooltip.cooldown': 'Δεν είναι ακόμη έτοιμη',
  'skills.tooltip.level': 'Απαιτεί επίπεδο {level}',
  'skills.tooltip.energy': 'Απαιτεί ενέργεια {energy}',
  'skills.tooltip.mana': 'Δεν υπάρχει αρκετή μάνα ({mana})',
  'skills.tooltip.ag': 'Δεν υπάρχει αρκετό AG ({ag})',
  'skills.tooltip.safezone': 'Δεν χρησιμοποιείται σε ασφαλή ζώνη',
  'skills.unnamed': 'Δεξιότητα #{number}',
  'skills.named': '{name} (Επ. {level})',
  'skills.damage': 'Ζημιά δεξιότητας +{value}',
  'skills.distance': 'Απόσταση: {value}',
  'skills.mana': 'Μάνα: {value}',
  'skills.ag': 'AG: {value}',
  'skills.readyIn': 'Έτοιμη σε {seconds} δευτ.',
  'skills.delay': 'Καθυστέρηση: {seconds} δευτ.',
} satisfies Partial<Record<keyof typeof en, string>>;
