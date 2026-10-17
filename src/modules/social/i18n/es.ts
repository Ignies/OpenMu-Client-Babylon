/** Spanish text of the `social` module. */

import type en from './en';

export default {
  'party.left': 'Has salido del grupo.',
  'party.onlyLeaderInvites': 'Solo el líder del grupo puede invitar.',
  'party.full': 'El grupo está lleno.',
  'party.invitationSent': 'Invitación de grupo enviada a {name}.',
  'party.reply.on': 'Invitaciones de grupo: se te preguntará.',
  'party.reply.off': 'Invitaciones de grupo: se rechazan solas. /re on para que se te pregunte otra vez.',
  'party.reply.auto': 'Invitaciones de grupo: se aceptan solas. /re on para que se te pregunte otra vez.',
  'party.reply.status': 'Invitaciones de grupo: /re {mode}. Usa /re on, /re off o /re auto.',
  'party.reply.declined': 'Invitación de grupo de {name} rechazada (/re).',
  'party.reply.accepted': 'Invitación de grupo de {name} aceptada (/re).',
  'guild.joinRequestSent': 'Solicitud de guild enviada a {name}.',
  'guild.onlyMasterAppoints':
    'Solo el máster del guild puede nombrar miembros.',
  'guild.onlyMasterCan': 'Solo el máster del guild puede hacer eso.',
  'guild.allianceRequestSent': 'Solicitud de alianza enviada a {name}.',
  'guild.hostilityRequestSent': 'Declaración de rivalidad enviada a {name}.',
  'stats.added': '{amount} puntos añadidos a {stat}.',
  'stats.name.str': 'Fuerza',
  'stats.name.agi': 'Agilidad',
  'stats.name.vit': 'Vitalidad',
  'stats.name.ene': 'Energía',
  'stats.name.cmd': 'Comando',
} satisfies Partial<Record<keyof typeof en, string>>;
