/** sr-Latn text of `versions/shared/ui/hud/bottom_bar`. */

import type en from './en';

export default {
  'bottomBar.itemShop': 'Prodavnica predmeta',
  'bottomBar.characterInfo': 'Informacije o liku',
  'bottomBar.inventory': 'Inventar',
  'bottomBar.friendList': 'Lista prijatelja',
  'bottomBar.noSkill': 'Bez veštine (desni klik = napad)',
  'bottomBar.emptySlot': '[{key}] prazno',
  'bottomBar.itemSlot': '{name} [{key}]',
  'bottomBar.skillHint': ': klik otvara listu veština, desni klik je običan napad',
  'bottomBar.pickSkill': '[{key}] prazno: klikni da izabereš veštinu',
  'bottomBar.boundSlot': '{name} [{key}]: desni klik za promenu',
  'bottomBar.clearSlot': 'Ostavi polje [{key}] prazno',
  'bottomBar.pet.normal': 'Osn',
  'bottomBar.pet.random': 'Nas',
  'bottomBar.pet.owner': 'Vla',
  'bottomBar.pet.target': 'Cilj',
  'bottomBar.pet.needTarget': 'Prvo izaberi metu za gavrana',
  'exp.title': 'Iskustvo',
} satisfies Partial<Record<keyof typeof en, string>>;
