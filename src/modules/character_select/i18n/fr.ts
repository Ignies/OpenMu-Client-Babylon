/** French text of the `character_select` module. */

import type en from './en';

export default {
  'characters.create.minLength': 'Saisissez plus de 4 lettres',
  'characters.create.specialName': 'Les symboles sont interdits.',
  'characters.create.reservedName': 'Ce nom est réservé.',
  'characters.create.failed':
    'Nom de personnage incorrect ou déjà utilisé.',
} satisfies Partial<Record<keyof typeof en, string>>;
