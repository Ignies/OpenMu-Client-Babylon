/** fil text of `src/modules/social`. */

import type en from './en';

export default {
  'party.left': 'Umalis ka na sa party.',
  'party.onlyLeaderInvites': 'Ang pinuno lamang ng party ang makapag-iimbita.',
  'party.full': 'Puno na ang party.',
  'party.invitationSent': 'Naipadala ang imbitasyon sa party kay {name}.',
  'party.reply.on': 'Imbitasyon sa party: tatanungin ka.',
  'party.reply.off': 'Imbitasyon sa party: kusang tinatanggihan. /re on para tanungin ka muli.',
  'party.reply.auto': 'Imbitasyon sa party: kusang tinatanggap. /re on para tanungin ka muli.',
  'party.reply.status': 'Imbitasyon sa party: /re {mode}. Gamitin ang /re on, /re off o /re auto.',
  'party.reply.declined': 'Tinanggihan ang imbitasyon sa party mula kay {name} (/re).',
  'party.reply.accepted': 'Tinanggap ang imbitasyon sa party mula kay {name} (/re).',
  'guild.joinRequestSent': 'Naipadala ang kahilingang sumali sa guild kay {name}.',
  'guild.onlyMasterAppoints': 'Ang guild master lamang ang makapagtatalaga ng mga miyembro.',
  'guild.onlyMasterCan': 'Ang guild master lamang ang makagagawa niyan.',
  'guild.allianceRequestSent': 'Naipadala ang alok na alyansa kay {name}.',
  'guild.hostilityRequestSent': 'Naipadala ang deklarasyon ng pagkapoot kay {name}.',
} satisfies Partial<Record<keyof typeof en, string>>;
