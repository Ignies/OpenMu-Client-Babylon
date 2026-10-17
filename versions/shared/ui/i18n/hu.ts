/** hu text of `versions/shared/ui`. */

import type en from './en';

export default {
  'servers.loading': 'Szerverlista betöltése...',
  'servers.serverName': 'Szerver {number}',
  'login.id': 'ID',
  'login.password': 'Jelszó',
  'options.title': 'Beállítások',
  'options.texturePack': 'Modelltextúrák',
  'options.texturePack.original': 'Eredeti',
  'options.texturePackHint': 'Nagyobb felbontású modelltextúrák, újratöltés nélkül alkalmazva',
  'session.toLevel': 'Szintlépésig',
  'bottomBar.pet.normalTip': 'Alap: a holló veled marad',
  'bottomBar.pet.randomTip': 'Véletlen: bármit megtámad a közelben',
  'bottomBar.pet.ownerTip': 'Gazda: azt támadja, amit te',
  'bottomBar.pet.targetTip': 'Cél: a jelenlegi célpontodat támadja',
  'skills.title': 'Képességek',
  'skills.empty': 'Nincs megtanult képesség',
  'chatRoom.leave': 'Kilépés',
  'command.trade': 'Csere',
  'command.purchase': 'Vásárlás',
  'command.party': 'Csapat',
  'command.whisper': 'Suttogás',
  'command.follow': 'Követés',
  'command.battle': 'Harc',
  'warp.title': 'Teleportálás',
  'instrument.putAway': 'Elrakás',
  'prompt.trade': 'Csere',
} satisfies Partial<Record<keyof typeof en, string>>;
