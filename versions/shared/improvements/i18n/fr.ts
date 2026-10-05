/** French text of the improvements. */

import type en from './en';

export default {
  'fidelity.otherPlayersOwnSpeed': 'Autres joueurs à leur propre vitesse',
  'fidelity.otherPlayersOwnSpeed.hint':
    'Les autres joueurs frappent et lancent leurs sorts à leur propre vitesse. Classique : tout le monde bouge à votre vitesse, comme dans l\'original.',
  'fidelity.masterBuffCancel': 'Les buffs de maître s\'arrêtent à l\'annulation',
  'fidelity.masterBuffCancel.hint':
    'Un buff de maître ou de Rage Fighter disparaît dès que le serveur l\'annule. Classique : il reste jusqu\'à la fin de son minuteur.',
  'fidelity.archangelFeathers': 'Plumes des archanges',
  'fidelity.archangelFeathers.hint':
    'Les archanges de Blood Castle perdent des plumes et leur lueur au sol est plus large. Classique : la petite lueur d\'origine, sans plumes.',
  'fidelity.loginChandeliers': 'Lustres allumés à la connexion',
  'fidelity.loginChandeliers.hint':
    'Les lustres de l\'écran de connexion brûlent. Classique : ils sont éteints, comme dans l\'original.',
  'fidelity.wingShadows': 'Ombres des ailes',
  'fidelity.wingShadows.hint':
    'Les ailes projettent une ombre. Classique : pas d\'ombre, comme dans l\'original.',
  'fidelity.torchCrackle': 'Bruit des torches',
  'fidelity.torchCrackle.hint':
    'Les torches crépitent quand vous êtes proche. Classique : les torches sont muettes.',
  'fidelity.loginWallTorches': 'Torches murales allumées à la connexion',
  'fidelity.loginWallTorches.hint':
    'Les torches murales de l\'écran de connexion brûlent et éclairent le sol. Classique : seulement leur halo, comme dans l\'original.',
  'fidelity.fortressLights': 'Lumières de la Forteresse impériale',
  'fidelity.fortressLights.hint':
    'Les torches, lustres et braseros de la Forteresse impériale éclairent le sol autour d\'eux. Classique : aucune lumière, comme dans l\'original.',
  'fidelity.lampFlares': 'Halos des lampes et des feux',
  'fidelity.lampFlares.hint':
    'Les réverbères, bougies, âtres et braseros brillent d\'un halo. Classique : aucun halo, comme dans l\'original.',
  'fidelity.roofFade': 'Toits transparents',
  'fidelity.roofFade.hint':
    'Les toits s\'effacent quand vous êtes dessous, pour voir l\'intérieur. Classique : les toits restent toujours affichés.',
} satisfies Partial<Record<keyof typeof en, string>>;
