/** Romanian text of several windows, HUD elements and pages (no single owner). */

import type en from './en';

export default {
  'servers.loading': 'Se încarcă lista de servere...',
  'servers.serverName': 'Server {number}',
  'login.id': 'ID',
  'login.password': 'Parolă',

  'options.title': 'Opțiuni',
  'options.texturePack': 'Texturi de model',
  'options.texturePack.original': 'Originale',
  'options.texturePackHint': 'Texturi de model la rezoluție mai mare, aplicate fără reîncărcare',
  'session.toLevel': 'Până la nivel',
  'bottomBar.pet.normalTip': 'Normal: corbul rămâne lângă tine',
  'bottomBar.pet.randomTip': 'Aleator: atacă orice se apropie',
  'bottomBar.pet.ownerTip': 'Stăpân: atacă ce ataci tu',
  'bottomBar.pet.targetTip': 'Țintă: atacă ținta ta curentă',

  'skills.title': 'Abilități',
  'skills.empty': 'Nicio abilitate învățată',
  'chatRoom.leave': 'Ieși',
  'command.trade': 'Schimbă',
  'command.purchase': 'Cumpără',
  'command.party': 'Grup',
  'command.whisper': 'Șoptește',
  'command.follow': 'Urmează',
  'command.battle': 'Luptă',
  'warp.title': 'Fereastra de teleportare',
  'instrument.putAway': 'Pune deoparte',
  'prompt.trade': 'Schimb',
} satisfies Partial<Record<keyof typeof en, string>>;
