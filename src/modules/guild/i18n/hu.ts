/** hu text of `src/modules/guild`. */

import type en from './en';

export default {
  'guild.memberLeft': '{name} kilépett a céhből.',
  'guild.youLeft': 'Kiléptél a céhből.',
  'guild.disbanded': 'A céh feloszlott.',
  'guild.memberRemoved': 'A tagot eltávolították a céhből.',
  'guild.onlyMasterRemoves': 'Csak a céhmester távolíthat el tagokat.',
  'guild.wrongPassword': 'A megadott jelszó hibás.',
  'guild.created': 'A céh létrejött.',
  'guild.nameTaken': 'Ez a céhnév már foglalt.',
  'guild.createFailed': 'A céhet nem sikerült létrehozni.',
  'guild.joinRefused': 'A céhmester elutasította a kérésedet.',
  'guild.joined': 'Beléptél a céhbe.',
  'guild.isFull': 'A céh megtelt.',
  'guild.masterUnavailable': 'A céhmester nem elérhető.',
  'guild.masterBusy': 'A céhmester elfoglalt. Próbáld később.',
  'guild.needLevel6': 'Céhbe lépéshez legalább 6. szintűnek kell lenned.',
} satisfies Partial<Record<keyof typeof en, string>>;
