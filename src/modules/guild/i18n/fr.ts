/** French text of the `guild` module. */

import type en from './en';

export default {
  'guild.memberLeft': '{name} a quitté la guilde.',
  'guild.youLeft': 'Vous avez quitté la guilde.',
  'guild.disbanded': 'La guilde a été dissoute.',
  'guild.memberRemoved': 'Le membre a été exclu de la guilde.',
  'guild.onlyMasterRemoves':
    'Seul le maître de guilde peut exclure des membres.',
  'guild.wrongPassword': 'Le mot de passe saisi est incorrect.',
  'guild.created': 'La guilde a été créée.',
  'guild.nameTaken': 'Ce nom de guilde est déjà pris.',
  'guild.createFailed': 'La guilde n’a pas pu être créée.',
  'guild.joinRefused': 'Le maître de guilde a refusé votre demande.',
  'guild.joined': 'Vous avez rejoint la guilde.',
  'guild.isFull': 'La guilde est complète.',
  'guild.masterUnavailable': 'Le maître de guilde n’est pas disponible.',
  'guild.masterBusy': 'Le maître de guilde est occupé. Réessayez plus tard.',
  'guild.needLevel6':
    'Il faut au moins le niveau 6 pour rejoindre une guilde.',
} satisfies Partial<Record<keyof typeof en, string>>;
