/** cs text of `src/modules/guild`. */

import type en from './en';

export default {
  'guild.memberLeft': 'Hráč {name} opustil cech.',
  'guild.youLeft': 'Už nejsi v cechu.',
  'guild.disbanded': 'Cech byl rozpuštěn.',
  'guild.memberRemoved': 'Člen byl z cechu odebrán.',
  'guild.onlyMasterRemoves': 'Členy může odebírat jen mistr cechu.',
  'guild.wrongPassword': 'Zadané heslo je nesprávné.',
  'guild.created': 'Cech byl vytvořen.',
  'guild.nameTaken': 'Tento název cechu je už obsazený.',
  'guild.createFailed': 'Cech nelze vytvořit.',
  'guild.joinRefused': 'Mistr cechu tvou žádost odmítl.',
  'guild.joined': 'Jsi v cechu.',
  'guild.isFull': 'Cech je plný.',
  'guild.masterUnavailable': 'Mistr cechu není k dispozici.',
  'guild.masterBusy': 'Mistr cechu je zaneprázdněn. Zkus to později.',
  'guild.needLevel6': 'Ke vstupu do cechu potřebuješ alespoň úroveň 6.',
} satisfies Partial<Record<keyof typeof en, string>>;
