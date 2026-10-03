/** Polish text of the `guild` module. */

import type en from './en';

export default {
  'guild.memberLeft': '{name} opuszcza gildię.',
  'guild.youLeft': 'Opuszczasz gildię.',
  'guild.disbanded': 'Gildia została rozwiązana.',
  'guild.memberRemoved': 'Członek został usunięty z gildii.',
  'guild.onlyMasterRemoves': 'Tylko mistrz gildii może usuwać członków.',
  'guild.wrongPassword': 'Wpisane hasło jest nieprawidłowe.',
  'guild.created': 'Gildia została utworzona.',
  'guild.nameTaken': 'Ta nazwa gildii jest już zajęta.',
  'guild.createFailed': 'Nie udało się utworzyć gildii.',
  'guild.joinRefused': 'Mistrz gildii odrzucił twoją prośbę.',
  'guild.joined': 'Dołączasz do gildii.',
  'guild.isFull': 'Gildia jest pełna.',
  'guild.masterUnavailable': 'Mistrz gildii jest niedostępny.',
  'guild.masterBusy': 'Mistrz gildii jest zajęty. Spróbuj później.',
  'guild.needLevel6': 'Musisz mieć co najmniej 6 poziom, aby dołączyć do gildii.',
} satisfies Partial<Record<keyof typeof en, string>>;
