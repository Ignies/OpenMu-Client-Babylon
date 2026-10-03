/** French text of the `bottom_bar` HUD element. */

import type en from './en';

export default {
  'bottomBar.itemShop': 'Boutique',
  'bottomBar.characterInfo': 'Informations du personnage',
  'bottomBar.inventory': 'Inventaire',
  'bottomBar.friendList': 'Liste d’amis',
  'bottomBar.options': 'Options',
  'bottomBar.noSkill': 'Aucune compétence (clic droit = attaque)',
  'bottomBar.emptySlot': '[{key}] vide',
  'bottomBar.itemSlot': '{name} [{key}]',
  'bottomBar.skillHint':
    ' - clic : liste des compétences, clic droit : attaque simple',
  'bottomBar.pickSkill': '[{key}] vide - cliquez pour choisir une compétence',
  'bottomBar.boundSlot': '{name} [{key}] - clic droit pour changer',
  'bottomBar.clearSlot': 'Laisser l’emplacement [{key}] vide',
  'bottomBar.pet.normal': 'Nor',
  'bottomBar.pet.random': 'Alé',
  'bottomBar.pet.owner': 'Mtr',
  'bottomBar.pet.target': 'Cib',
  'bottomBar.pet.needTarget': 'Choisissez d’abord une cible pour le corbeau',
  'exp.title': 'Expérience',
} satisfies Partial<Record<keyof typeof en, string>>;
