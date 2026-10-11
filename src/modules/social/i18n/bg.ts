/** Bulgarian text of the `social` module. */

import type en from './en';

export default {
  'party.left': 'Излезе от групата.',
  'party.onlyLeaderInvites': 'Само водачът на групата може да кани.',
  'party.full': 'Групата е пълна.',
  'party.invitationSent': 'Покана за група е изпратена до {name}.',
  'party.reply.on': 'Покани за група: ще бъдете питани.',
  'party.reply.off': 'Покани за група: отказват се сами. /re on, за да бъдете питани отново.',
  'party.reply.auto': 'Покани за група: приемат се сами. /re on, за да бъдете питани отново.',
  'party.reply.status': 'Покани за група: /re {mode}. Използвайте /re on, /re off или /re auto.',
  'party.reply.declined': 'Поканата за група от {name} е отказана (/re).',
  'party.reply.accepted': 'Поканата за група от {name} е приета (/re).',
  'guild.joinRequestSent': 'Заявка за guild е изпратена до {name}.',
  'guild.onlyMasterAppoints':
    'Само майсторът на guild може да назначава членове.',
  'guild.onlyMasterCan': 'Само майсторът на guild може да прави това.',
  'guild.allianceRequestSent': 'Заявка за алианс е изпратена до {name}.',
  'guild.hostilityRequestSent': 'Обявяване на вражда е изпратено до {name}.',
} satisfies Partial<Record<keyof typeof en, string>>;
