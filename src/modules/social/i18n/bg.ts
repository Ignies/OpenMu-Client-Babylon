/** Bulgarian text of the `social` module. */

import type en from './en';

export default {
  'party.left': 'Излезе от групата.',
  'party.onlyLeaderInvites': 'Само водачът на групата може да кани.',
  'party.full': 'Групата е пълна.',
  'party.invitationSent': 'Покана за група е изпратена до {name}.',
  'guild.joinRequestSent': 'Заявка за guild е изпратена до {name}.',
  'guild.onlyMasterAppoints':
    'Само майсторът на guild може да назначава членове.',
  'guild.onlyMasterCan': 'Само майсторът на guild може да прави това.',
  'guild.allianceRequestSent': 'Заявка за алианс е изпратена до {name}.',
  'guild.hostilityRequestSent': 'Обявяване на вражда е изпратено до {name}.',
} satisfies Partial<Record<keyof typeof en, string>>;
