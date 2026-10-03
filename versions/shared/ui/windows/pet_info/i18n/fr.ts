/** French text of the `pet_info` window. */

import type en from './en';

export default {
  'petInfo.title': 'Familier',
  'petInfo.darkHorse': 'Dark Horse',
  'petInfo.darkRaven': 'Dark Raven',
  'petInfo.notEquipped': '{pet} n’est pas équipé.',
  'petInfo.waiting': 'En attente des infos du familier...',
  'petInfo.level': 'Niveau {level}',
  'petInfo.life': 'Vie {current} / {max}',
  'petInfo.exp': 'Exp {current} / {next}',
  'petInfo.damage': 'Dégâts {min}~{max} (Taux {rate})',
  'petInfo.attackSpeed': 'Vitesse d’attaque {speed}',
  'petInfo.defense': 'Défense {defense}',
  'petInfo.command': 'Ordre',
  'petInfo.cmdNormal': 'Attaque normale',
  'petInfo.cmdRandom': 'Attaque aléatoire',
  'petInfo.cmdOwner': 'Attaquer avec le maître',
  'petInfo.cmdTarget': 'Attaquer la cible',
  'petInfo.close': 'Fermer',
} satisfies Partial<Record<keyof typeof en, string>>;
