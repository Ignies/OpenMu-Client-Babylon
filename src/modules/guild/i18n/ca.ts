/** ca text of `src/modules/guild`. */

import type en from './en';

export default {
  'guild.memberLeft': 'El jugador {name} ha deixat el gremi.',
  'guild.youLeft': 'Has deixat el gremi.',
  'guild.disbanded': 'El gremi s\'ha dissolt.',
  'guild.memberRemoved': 'S\'ha expulsat el membre del gremi.',
  'guild.onlyMasterRemoves': 'Només el mestre del gremi pot expulsar membres.',
  'guild.wrongPassword': 'La contrasenya que has introduït no és correcta.',
  'guild.created': 'S\'ha creat el gremi.',
  'guild.nameTaken': 'Aquest nom de gremi ja està agafat.',
  'guild.createFailed': 'No s\'ha pogut crear el gremi.',
  'guild.joinRefused': 'El mestre del gremi ha rebutjat la teva sol·licitud.',
  'guild.joined': 'Ara formes part del gremi.',
  'guild.isFull': 'El gremi és ple.',
  'guild.masterUnavailable': 'El mestre del gremi no està disponible.',
  'guild.masterBusy': 'El mestre del gremi està ocupat. Torna-ho a provar més tard.',
  'guild.needLevel6': 'Necessites com a mínim el nivell 6 per entrar en un gremi.',
} satisfies Partial<Record<keyof typeof en, string>>;
