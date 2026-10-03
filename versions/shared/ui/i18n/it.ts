/** Italian text of several windows, HUD elements and pages (no single owner). */

import type en from './en';

export default {
  'servers.loading': 'Caricamento della lista dei server...',
  'servers.serverName': 'Server {number}',
  'login.id': 'ID',
  'login.password': 'Password',

  'options.title': 'Opzioni',
  'options.texturePack': 'Texture dei modelli',
  'options.texturePack.original': 'Originali',
  'options.texturePackHint': 'Texture dei modelli ad alta risoluzione, applicate senza ricaricare',
  'session.toLevel': 'Al livello',
  'bottomBar.pet.normalTip': 'Normale: il corvo resta con te',
  'bottomBar.pet.randomTip': 'Casuale: attacca ciò che gli capita vicino',
  'bottomBar.pet.ownerTip': 'Padrone: attacca ciò che attacchi tu',
  'bottomBar.pet.targetTip': 'Bersaglio: attacca il tuo bersaglio attuale',

  'skills.title': 'Abilità',
  'skills.empty': 'Nessuna abilità appresa',
  'chatRoom.leave': 'Esci',
  'command.trade': 'Scambia',
  'command.purchase': 'Compra',
  'command.party': 'Gruppo',
  'command.whisper': 'Sussurra',
  'command.follow': 'Segui',
  'command.battle': 'Battaglia',
  'warp.title': 'Finestra di teletrasporto',
  'instrument.putAway': 'Riponi',
  'prompt.trade': 'Scambio',
} satisfies Partial<Record<keyof typeof en, string>>;
