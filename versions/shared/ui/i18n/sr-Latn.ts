/** sr-Latn text of `versions/shared/ui`. */

import type en from './en';

export default {
  'servers.loading': 'Učitavanje liste servera...',
  'servers.serverName': 'Server {number}',
  'login.id': 'ID',
  'login.password': 'Lozinka',
  'options.title': 'Opcije',
  'options.texturePack': 'Teksture modela',
  'options.texturePack.original': 'Originalne',
  'options.texturePackHint':
    'Teksture modela veće rezolucije, primenjuju se bez ponovnog učitavanja',
  'session.toLevel': 'Do nivoa',
  'bottomBar.pet.normalTip': 'Osnovno: gavran ostaje uz tebe',
  'bottomBar.pet.randomTip': 'Nasumično: napada sve u blizini',
  'bottomBar.pet.ownerTip': 'Vlasnik: napada ono što ti napadaš',
  'bottomBar.pet.targetTip': 'Cilj: napada tvoju trenutnu metu',
  'skills.title': 'Veštine',
  'skills.empty': 'Nema naučenih veština',
  'chatRoom.leave': 'Izađi',
  'command.trade': 'Razmena',
  'command.purchase': 'Kupovina',
  'command.party': 'Grupa',
  'command.whisper': 'Šapat',
  'command.follow': 'Prati',
  'command.battle': 'Borba',
  'warp.title': 'Prozor za teleport',
  'instrument.putAway': 'Skloni',
  'prompt.trade': 'Razmena',
} satisfies Partial<Record<keyof typeof en, string>>;
