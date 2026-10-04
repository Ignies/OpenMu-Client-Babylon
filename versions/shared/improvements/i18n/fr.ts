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
} satisfies Partial<Record<keyof typeof en, string>>;
