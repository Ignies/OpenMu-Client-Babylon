/** ca text of `src/modules/social`. */

import type en from './en';

export default {
  'party.left': 'Has sortit del grup.',
  'party.onlyLeaderInvites': 'Només el líder del grup pot convidar.',
  'party.full': 'El grup és ple.',
  'party.invitationSent': 'S\'ha enviat una invitació de grup al jugador {name}.',
  'guild.joinRequestSent': 'S\'ha enviat una sol·licitud d\'ingrés al gremi al jugador {name}.',
  'guild.onlyMasterAppoints': 'Només el mestre del gremi pot nomenar membres.',
  'guild.onlyMasterCan': 'Només el mestre del gremi pot fer això.',
  'guild.allianceRequestSent': 'S\'ha enviat una sol·licitud d\'aliança al jugador {name}.',
  'guild.hostilityRequestSent': 'S\'ha enviat una declaració d\'hostilitat al jugador {name}.',
  'party.reply.on': 'Invitacions de grup: se\'t preguntarà.',
  'party.reply.off':
    'Invitacions de grup: es rebutgen soles. /re on perquè se\'t torni a preguntar.',
  'party.reply.auto':
    'Invitacions de grup: s\'accepten soles. /re on perquè se\'t torni a preguntar.',
  'party.reply.status': 'Invitacions de grup: /re {mode}. Fes servir /re on, /re off o /re auto.',
  'party.reply.declined': 'S\'ha rebutjat la invitació de grup del jugador {name} (/re).',
  'party.reply.accepted': 'S\'ha acceptat la invitació de grup del jugador {name} (/re).',
} satisfies Partial<Record<keyof typeof en, string>>;
