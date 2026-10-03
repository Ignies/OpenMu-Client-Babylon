/** German text of several windows, HUD elements and pages (no single owner). */

import type en from './en';

export default {
  'servers.loading': 'Serverliste wird geladen...',
  'servers.serverName': 'Server {number}',
  'login.id': 'ID',
  'login.password': 'Passwort',

  'options.title': 'Optionen',
  'options.texturePack': 'Modelltexturen',
  'options.texturePack.original': 'Original',
  'options.texturePackHint': 'Höher aufgelöste Modelltexturen, ohne Neuladen übernommen',
  'session.toLevel': 'Bis Level',
  'bottomBar.pet.normalTip': 'Normal: der Rabe bleibt bei dir',
  'bottomBar.pet.randomTip': 'Zufall: greift alles in der Nähe an',
  'bottomBar.pet.ownerTip': 'Herr: greift an, was du angreifst',
  'bottomBar.pet.targetTip': 'Ziel: greift dein aktuelles Ziel an',

  'skills.title': 'Fertigkeiten',
  'skills.empty': 'Keine Fertigkeiten erlernt',
  'chatRoom.leave': 'Verlassen',
  'command.trade': 'Handeln',
  'command.purchase': 'Kaufen',
  'command.party': 'Gruppe',
  'command.whisper': 'Flüstern',
  'command.follow': 'Folgen',
  'command.battle': 'Kampf',
  'warp.title': 'Teleport-Fenster',
  'instrument.putAway': 'Wegstecken',
  'prompt.trade': 'Handel',
} satisfies Partial<Record<keyof typeof en, string>>;
