/** French text of several windows, HUD elements and pages (no single owner). */

import type en from './en';

export default {
  'servers.loading': 'Chargement de la liste des serveurs...',
  'servers.serverName': 'Serveur {number}',
  'login.id': 'ID',
  'login.password': 'Mot de passe',

  'options.title': 'Options',
  'options.texturePack': 'Textures des modèles',
  'options.texturePack.original': 'Originales',
  'options.texturePackHint': 'Textures de modèles en haute résolution, appliquées sans rechargement',
  'session.toLevel': 'Au niveau',
  'bottomBar.pet.normalTip': 'Normal : le corbeau reste avec vous',
  'bottomBar.pet.randomTip': 'Aléatoire : attaque ce qui passe à portée',
  'bottomBar.pet.ownerTip': 'Maître : attaque ce que vous attaquez',
  'bottomBar.pet.targetTip': 'Cible : attaque votre cible actuelle',

  'skills.title': 'Compétences',
  'skills.empty': 'Aucune compétence apprise',
  'chatRoom.leave': 'Quitter',
  'command.trade': 'Échanger',
  'command.purchase': 'Acheter',
  'command.party': 'Groupe',
  'command.whisper': 'Chuchoter',
  'command.follow': 'Suivre',
  'command.battle': 'Combat',
  'warp.title': 'Fenêtre de téléportation',
  'instrument.putAway': 'Ranger',
  'prompt.trade': 'Échange',
} satisfies Partial<Record<keyof typeof en, string>>;
