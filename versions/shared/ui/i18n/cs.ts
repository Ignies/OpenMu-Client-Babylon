/** cs text of `versions/shared/ui`. */

import type en from './en';

export default {
  'servers.loading': 'Načítání seznamu serverů...',
  'servers.serverName': 'Server {number}',
  'login.id': 'ID',
  'login.password': 'Heslo',
  'options.title': 'Nastavení',
  'options.texturePack': 'Textury modelů',
  'options.texturePack.original': 'Původní',
  'options.texturePackHint':
    'Textury modelů ve vyšším rozlišení, použijí se bez opětovného načtení',
  'session.toLevel': 'Do úrovně',
  'bottomBar.pet.normalTip': 'Výchozí: havran zůstává u tebe',
  'bottomBar.pet.randomTip': 'Náhodně: útočí na cokoli poblíž',
  'bottomBar.pet.ownerTip': 'Pán: útočí na to, na co útočíš ty',
  'bottomBar.pet.targetTip': 'Cíl: útočí na tvůj aktuální cíl',
  'skills.title': 'Dovednosti',
  'skills.empty': 'Žádné naučené dovednosti',
  'chatRoom.leave': 'Odejít',
  'command.trade': 'Obchod',
  'command.purchase': 'Nákup',
  'command.party': 'Družina',
  'command.whisper': 'Šepot',
  'command.follow': 'Následovat',
  'command.battle': 'Souboj',
  'warp.title': 'Okno přesunů',
  'instrument.putAway': 'Uklidit',
  'prompt.trade': 'Obchod',
} satisfies Partial<Record<keyof typeof en, string>>;
