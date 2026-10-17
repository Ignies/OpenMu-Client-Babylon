/** Italian text of the `social` module. */

import type en from './en';

export default {
  'party.left': 'Hai lasciato il gruppo.',
  'party.onlyLeaderInvites': 'Solo il capogruppo può invitare.',
  'party.full': 'Il gruppo è al completo.',
  'party.invitationSent': 'Invito al gruppo inviato a {name}.',
  'party.reply.on': 'Inviti al gruppo: ti verrà chiesto.',
  'party.reply.off': 'Inviti al gruppo: rifiutati da soli. /re on per tornare a essere interpellato.',
  'party.reply.auto': 'Inviti al gruppo: accettati da soli. /re on per tornare a essere interpellato.',
  'party.reply.status': 'Inviti al gruppo: /re {mode}. Usa /re on, /re off o /re auto.',
  'party.reply.declined': 'Invito al gruppo di {name} rifiutato (/re).',
  'party.reply.accepted': 'Invito al gruppo di {name} accettato (/re).',
  'guild.joinRequestSent': 'Richiesta di gilda inviata a {name}.',
  'guild.onlyMasterAppoints':
    'Solo il master della gilda può nominare i membri.',
  'guild.onlyMasterCan': 'Solo il master della gilda può farlo.',
  'guild.allianceRequestSent': 'Richiesta di alleanza inviata a {name}.',
  'guild.hostilityRequestSent': 'Dichiarazione di rivalità inviata a {name}.',
  'stats.added': '{amount} punti aggiunti a {stat}.',
  'stats.name.str': 'Forza',
  'stats.name.agi': 'Agilità',
  'stats.name.vit': 'Vitalità',
  'stats.name.ene': 'Energia',
  'stats.name.cmd': 'Comando',
} satisfies Partial<Record<keyof typeof en, string>>;
