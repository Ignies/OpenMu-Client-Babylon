/** French text of no single owner: shared by many (`common.*`, language names). */

import type en from './en';

export default {
  'common.ok': 'OK',
  'common.cancel': 'Annuler',
  'common.close': 'Fermer',
  'common.none': 'Aucune',
  'common.create': 'Créer',
  'common.creating': 'Création...',
  'common.send': 'Envoyer',
  'common.sending': 'Envoi...',
  'common.loading': 'Chargement...',
  'common.warning': 'Attention',
  'common.level': 'Niveau',
  'common.offline': 'Hors ligne',
  'common.off': 'Non',
  'common.zen': 'Zen',
  'common.notEnoughZen': 'Pas assez de Zen',
  'options.quality.classic': 'Classique',
  'options.quality.enhanced': 'Améliorée',
} satisfies Partial<Record<keyof typeof en, string>>;
