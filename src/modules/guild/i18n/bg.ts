/** Bulgarian text of the `guild` module. */

import type en from './en';

export default {
  'guild.memberLeft': '{name} напусна guild-а.',
  'guild.youLeft': 'Напусна guild-а.',
  'guild.disbanded': 'Guild-ът беше разпуснат.',
  'guild.memberRemoved': 'Членът беше отстранен от guild-а.',
  'guild.onlyMasterRemoves':
    'Само майсторът на guild може да отстранява членове.',
  'guild.wrongPassword': 'Въведената парола не е вярна.',
  'guild.created': 'Guild-ът беше създаден.',
  'guild.nameTaken': 'Това име на guild вече е заето.',
  'guild.createFailed': 'Guild-ът не можа да бъде създаден.',
  'guild.joinRefused': 'Майсторът на guild отказа заявката ти.',
  'guild.joined': 'Влезе в guild-а.',
  'guild.isFull': 'Guild-ът е пълен.',
  'guild.masterUnavailable': 'Майсторът на guild не е на разположение.',
  'guild.masterBusy': 'Майсторът на guild е зает. Опитай по-късно.',
  'guild.needLevel6': 'Трябва поне ниво 6, за да влезеш в guild.',
} satisfies Partial<Record<keyof typeof en, string>>;
