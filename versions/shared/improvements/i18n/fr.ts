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
  'fidelity.torchCrackle': 'Bruit des torches',
  'fidelity.torchCrackle.hint':
    'Les torches crépitent quand vous êtes proche. Classique : les torches sont muettes.',
  'fidelity.loginWallTorches': 'Torches murales allumées à la connexion',
  'fidelity.loginWallTorches.hint':
    'Les torches murales de l\'écran de connexion brûlent et éclairent le sol. Classique : seulement leur halo, comme dans l\'original.',
  'fidelity.fortressLights': 'Lumières de la Forteresse impériale',
  'fidelity.fortressLights.hint':
    'Les torches, lustres et braseros de la Forteresse impériale éclairent le sol autour d\'eux. Classique : aucune lumière, comme dans l\'original.',
  'fidelity.lampFlares': 'Lumières et halos des lampes',
  'fidelity.lampFlares.hint':
    'Les réverbères, bougies, âtres et braseros brillent d\'un halo, les bougies brûlent et certaines lampes et certains feux éclairent le sol autour d\'eux. Classique : seulement ce que dessine l\'original.',
  'fidelity.roofFade': 'Toits transparents',
  'fidelity.roofFade.hint':
    'Les toits s\'effacent quand vous êtes dessous, pour voir l\'intérieur. Classique : les toits restent toujours affichés.',
  'fidelity.requestTimeout': 'Les demandes expirent après 20 s',
  'fidelity.requestTimeout.hint':
    'Une demande d’échange, de groupe ou de duel laissée sans réponse est refusée après 20 secondes. Classique : elle attend votre réponse.',
  'fidelity.noticeLinks': 'Liens dans les annonces du serveur',
  'fidelity.noticeLinks.hint':
    'Les adresses web des annonces du serveur sont des liens soulignés qui ouvrent un nouvel onglet. Classique : texte simple, comme dans l’original.',
  'fidelity.cameraKeepsView': 'Caméra conservée entre les cartes',
  'fidelity.cameraKeepsView.hint':
    'Le zoom, la rotation et l’inclinaison de la caméra restent les mêmes quand vous vous téléportez ou changez de carte, et un bouton Réinitialiser la caméra apparaît tant que la vue est déplacée. Classique : chaque changement de carte réinitialise la caméra, comme dans l’original.',
} satisfies Partial<Record<keyof typeof en, string>>;
