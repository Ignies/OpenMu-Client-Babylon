/** French text of the `personal_shop` window. */

import type en from './en';

export default {
  'personalShop.title': 'Boutique personnelle',
  'personalShop.button': 'Boutique',
  'personalShop.selling': 'Votre boutique est ouverte',
  'personalShop.namePlaceholder': 'Nom de la boutique',
  'personalShop.openTip': 'Ouvrir la boutique',
  'personalShop.closeTip': 'Fermer la boutique',
  'personalShop.info1': 'Fixez un prix sur chaque objet avant d’ouvrir.',
  'personalShop.info2': 'La boutique ferme si vous bougez ou vous déconnectez.',
  'personalShop.info3': 'Les acheteurs doivent se tenir à côté de vous.',
  'personalShop.info4': 'Les objets à vendre ne peuvent être ni utilisés ni jetés.',
  'personalShop.info5': 'Le Zen arrive directement dans votre inventaire.',
  'personalShop.warn1': 'Ne vendez jamais en dessous de la valeur d’un objet.',
  'personalShop.warn2': 'Le serveur a le dernier mot sur les prix.',
} satisfies Partial<Record<keyof typeof en, string>>;
