/** eu text of `src/modules/social`. */

import type en from './en';

export default {
  'party.left': 'Taldea utzi duzu.',
  'party.onlyLeaderInvites': 'Taldeburuak bakarrik gonbida dezake.',
  'party.full': 'Taldea beteta dago.',
  'party.invitationSent': 'Talde-gonbidapena bidali zaio {name} jokalariari.',
  'guild.joinRequestSent': 'Gremioan sartzeko eskaera bidali zaio {name} jokalariari.',
  'guild.onlyMasterAppoints': 'Gremio-buruak bakarrik izenda ditzake kideak.',
  'guild.onlyMasterCan': 'Gremio-buruak bakarrik egin dezake hori.',
  'guild.allianceRequestSent': 'Aliantza-eskaera bidali zaio {name} jokalariari.',
  'guild.hostilityRequestSent': 'Etsaitasun-eskaera bidali zaio {name} jokalariari.',
  'party.reply.on': 'Talde-gonbidapenak: galdetu egingo zaizu.',
  'party.reply.off': 'Talde-gonbidapenak: berez ukatzen dira. /re on berriro galdetzeko.',
  'party.reply.auto': 'Talde-gonbidapenak: berez onartzen dira. /re on berriro galdetzeko.',
  'party.reply.status': 'Talde-gonbidapenak: /re {mode}. Erabili /re on, /re off edo /re auto.',
  'party.reply.declined': '{name} jokalariaren talde-gonbidapena ukatu da (/re).',
  'party.reply.accepted': '{name} jokalariaren talde-gonbidapena onartu da (/re).',
  'stats.added': '{amount} puntu gehitu dira ezaugarri honi: {stat}.',
  'stats.name.str': 'Indarra',
  'stats.name.agi': 'Arintasuna',
  'stats.name.vit': 'Bizindarra',
  'stats.name.ene': 'Energia',
  'stats.name.cmd': 'Agintea',
} satisfies Partial<Record<keyof typeof en, string>>;
