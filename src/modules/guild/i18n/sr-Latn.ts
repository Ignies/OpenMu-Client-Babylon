/** sr-Latn text of `src/modules/guild`. */

import type en from './en';

export default {
  'guild.memberLeft': 'Igrač {name} napušta gildu.',
  'guild.youLeft': 'Više nisi u gildi.',
  'guild.disbanded': 'Gilda je raspuštena.',
  'guild.memberRemoved': 'Član je uklonjen iz gilde.',
  'guild.onlyMasterRemoves': 'Samo majstor gilde može da uklanja članove.',
  'guild.wrongPassword': 'Uneta lozinka nije ispravna.',
  'guild.created': 'Gilda je osnovana.',
  'guild.nameTaken': 'Taj naziv gilde je već zauzet.',
  'guild.createFailed': 'Gilda ne može da se osnuje.',
  'guild.joinRefused': 'Majstor gilde odbija tvoj zahtev.',
  'guild.joined': 'Sada si član gilde.',
  'guild.isFull': 'Gilda je puna.',
  'guild.masterUnavailable': 'Majstor gilde nije dostupan.',
  'guild.masterBusy': 'Majstor gilde je zauzet. Pokušaj kasnije.',
  'guild.needLevel6': 'Za pridruživanje gildi potreban je najmanje nivo 6.',
} satisfies Partial<Record<keyof typeof en, string>>;
