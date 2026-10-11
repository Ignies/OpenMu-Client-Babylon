/** French text of the `lahap` window. */

import type en from './en';

export default {
  'lahap.combineTitle': 'Combinaison de joyaux',
  'lahap.dismantleTitle': 'Démonter des joyaux',
  'lahap.menu1': 'Ici, vous pouvez combiner ou démonter',
  'lahap.menu2': 'divers joyaux.',
  'lahap.close': 'Fermer',
  'lahap.selectCombine': 'Choisissez un joyau à combiner.',
  'lahap.combineCount': 'Combiner {count} ({zen} zen requis)',
  'lahap.cost': 'Coût de la combinaison : {zen} zen',
  'lahap.selectDismantle': 'Choisissez un joyau à démonter.',
  'lahap.disband': 'Démonter',
  'lahap.disbandSure': 'Voulez-vous vraiment démonter {name} {level} ?',
  'lahap.dismantleCost': 'Coût du démontage : {zen} zen',
  'lahap.jewel.0': 'Joyau de Bénédiction',
  'lahap.jewel.1': "Joyau de l'Âme",
  'lahap.jewel.2': 'Joyau de Vie',
  'lahap.jewel.3': 'Joyau de Création',
  'lahap.jewel.4': 'Joyau du Gardien',
  'lahap.jewel.5': 'Pierre précieuse',
  'lahap.jewel.6': "Joyau d'Harmonie",
  'lahap.jewel.7': 'Joyau du Chaos',
  'lahap.jewel.8': 'Pierre de raffinage inférieure',
  'lahap.jewel.9': 'Pierre de raffinage supérieure',
} satisfies Partial<Record<keyof typeof en, string>>;
