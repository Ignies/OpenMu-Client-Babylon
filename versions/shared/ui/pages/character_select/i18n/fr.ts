/** French text of the `character_select` page. */

import type en from './en';

export default {
  'characters.loading': 'Chargement des personnages...',
  'characters.select': 'Choisissez un personnage',
  'characters.hint.select': 'Sélectionner',
  'characters.hint.zoomIn': 'Zoom avant',
  'characters.hint.zoomOut': 'Zoom arrière',
  'class.desc.darkWizard':
    'Royaume des magiciens, descendant d’Arka. Sa condition physique est faible, mais sa puissance est immense et il manie librement les sorts d’attaque.',
  'class.desc.darkKnight':
    'Royaume des chevaliers, descendant de Lorencia. Sa force et son escrime lui permettent de manier presque toutes les armes de corps à corps.',
  'class.desc.elf':
    'Royaume des elfes, descendant de Noria. Maître de l’arc et des flèches, il commande aussi divers sorts.',
  'class.desc.summoner':
    'Un mental solide et une intuition remarquable donnent le sort de malédiction le plus puissant. Elle attire aussi les invocateurs d’un autre monde et retourne contre eux sa sorcellerie.',
  'class.desc.rageFighter':
    'Héritiers légitimes des Chevaliers royaux de Karutan et artistes martiaux d’une grande force physique. Ils aident aussi le groupe avec des bénédictions de soutien.',
  'class.desc.magicGladiator':
    'Personnage mixte tenant du Dark Knight et du Dark Wizard. Maître du corps à corps, il lance aussi des sorts librement.',
  'class.desc.darkLord':
    'Personnage charismatique qui commande les troupes et manie l’esprit sombre et le cheval sombre.',
} satisfies Partial<Record<keyof typeof en, string>>;
