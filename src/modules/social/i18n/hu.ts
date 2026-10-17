/** hu text of `src/modules/social`. */

import type en from './en';

export default {
  'party.left': 'Kiléptél a csapatból.',
  'party.onlyLeaderInvites': 'Csak a csapatvezető hívhat meg másokat.',
  'party.full': 'A csapat megtelt.',
  'party.invitationSent': 'Csapatmeghívó elküldve {name} nevű játékosnak.',
  'guild.joinRequestSent': 'Céhfelvételi kérés elküldve {name} nevű játékosnak.',
  'guild.onlyMasterAppoints': 'Csak a céhmester nevezhet ki tagokat.',
  'guild.onlyMasterCan': 'Ezt csak a céhmester teheti meg.',
  'guild.allianceRequestSent': 'Szövetségi ajánlat elküldve {name} nevű játékosnak.',
  'guild.hostilityRequestSent': 'Ellenségeskedési nyilatkozat elküldve {name} nevű játékosnak.',
} satisfies Partial<Record<keyof typeof en, string>>;
