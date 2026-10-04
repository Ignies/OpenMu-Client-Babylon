/** Polish text of the `skill_tooltip` UI component. */

import type en from './en';

export default {
  'skills.tooltip.unknown': 'Nieznana umiejętność',
  'skills.tooltip.class': 'Twoja klasa nie może jej użyć',
  'skills.tooltip.weapon': 'Wymaga broni, która ją nadaje',
  'skills.tooltip.cooldown': 'Jeszcze niegotowa',
  'skills.tooltip.level': 'Wymaga poziomu {level}',
  'skills.tooltip.energy': 'Wymaga energii {energy}',
  'skills.tooltip.mana': 'Za mało many ({mana})',
  'skills.tooltip.ag': 'Za mało AG ({ag})',
  'skills.tooltip.safezone': 'Nie można użyć w strefie bezpiecznej',
  'skills.unnamed': 'Umiejętność nr {number}',
  'skills.named': '{name} (Poz.{level})',
  'skills.damage': 'Obrażenia umiejętności +{value}',
  'skills.distance': 'Zasięg: {value}',
  'skills.mana': 'Mana: {value}',
  'skills.ag': 'AG: {value}',
  'skills.readyIn': 'Gotowa za {seconds} s',
  'skills.delay': 'Opóźnienie: {seconds} s',
} satisfies Partial<Record<keyof typeof en, string>>;
