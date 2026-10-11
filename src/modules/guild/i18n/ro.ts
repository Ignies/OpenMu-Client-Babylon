/** Romanian text of the `guild` module. */

import type en from './en';

export default {
  'guild.memberLeft': '{name} a părăsit guildul.',
  'guild.youLeft': 'Ai părăsit guildul.',
  'guild.disbanded': 'Guildul a fost desființat.',
  'guild.memberRemoved': 'Membrul a fost scos din guild.',
  'guild.onlyMasterRemoves': 'Doar maestrul guildului poate scoate membri.',
  'guild.wrongPassword': 'Parola introdusă nu este corectă.',
  'guild.created': 'Guildul a fost creat.',
  'guild.nameTaken': 'Acel nume de guild este deja luat.',
  'guild.createFailed': 'Guildul nu a putut fi creat.',
  'guild.joinRefused': 'Maestrul guildului ți-a refuzat cererea.',
  'guild.joined': 'Ai intrat în guild.',
  'guild.isFull': 'Guildul este plin.',
  'guild.masterUnavailable': 'Maestrul guildului nu este disponibil.',
  'guild.masterBusy': 'Maestrul guildului este ocupat. Încearcă mai târziu.',
  'guild.needLevel6':
    'Îți trebuie cel puțin nivelul 6 ca să intri într-un guild.',
} satisfies Partial<Record<keyof typeof en, string>>;
