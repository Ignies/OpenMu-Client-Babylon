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
  'party.reply.on': 'Csapatmeghívások: rákérdezünk.',
  'party.reply.off': 'Csapatmeghívások: automatikusan elutasítva. /re on a rákérdezéshez.',
  'party.reply.auto': 'Csapatmeghívások: automatikusan elfogadva. /re on a rákérdezéshez.',
  'party.reply.status': 'Csapatmeghívások: /re {mode}. Használd: /re on, /re off vagy /re auto.',
  'party.reply.declined': 'Csapatmeghívás elutasítva, küldő: {name} (/re).',
  'party.reply.accepted': 'Csapatmeghívás elfogadva, küldő: {name} (/re).',
  'stats.added': '{amount} pont hozzáadva ehhez a tulajdonsághoz: {stat}.',
  'stats.name.str': 'Erő',
  'stats.name.agi': 'Ügyesség',
  'stats.name.vit': 'Vitalitás',
  'stats.name.ene': 'Energia',
  'stats.name.cmd': 'Vezetés',
} satisfies Partial<Record<keyof typeof en, string>>;
