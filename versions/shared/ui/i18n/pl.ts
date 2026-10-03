/** Polish text of several windows, HUD elements and pages (no single owner). */

import type en from './en';

export default {
  'servers.loading': 'Wczytywanie listy serwerów...',
  'servers.serverName': 'Serwer {number}',
  'login.id': 'ID',
  'login.password': 'Hasło',
  'options.title': 'Opcje',
  'options.texturePack': 'Tekstury modeli',
  'options.texturePack.original': 'Oryginalne',
  'options.texturePackHint':
    'Tekstury modeli w wyższej rozdzielczości, stosowane bez przeładowania',
  'session.toLevel': 'Do poziomu',
  'bottomBar.pet.normalTip': 'Domyślnie: kruk zostaje przy tobie',
  'bottomBar.pet.randomTip': 'Losowo: atakuje wszystko w pobliżu',
  'bottomBar.pet.ownerTip': 'Pan: atakuje to, co ty atakujesz',
  'bottomBar.pet.targetTip': 'Cel: atakuje twój obecny cel',
  'skills.title': 'Umiejętności',
  'skills.empty': 'Brak wyuczonych umiejętności',
  'chatRoom.leave': 'Wyjdź',
  'command.trade': 'Handel',
  'command.purchase': 'Kup',
  'command.party': 'Drużyna',
  'command.whisper': 'Szept',
  'command.follow': 'Podążaj',
  'command.battle': 'Walka',
  'warp.title': 'Okno teleportacji',
  'instrument.putAway': 'Schowaj',
  'prompt.trade': 'Handel',
} satisfies Partial<Record<keyof typeof en, string>>;
