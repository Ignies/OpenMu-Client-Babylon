/** German text of the improvements. */

import type en from './en';

export default {
  'fidelity.otherPlayersOwnSpeed': 'Andere Spieler mit eigenem Tempo',
  'fidelity.otherPlayersOwnSpeed.hint':
    'Andere Spieler schlagen und zaubern mit ihrem eigenen Angriffs- und Magietempo. Klassisch: alle bewegen sich in deinem Tempo, wie im Original.',
  'fidelity.masterBuffCancel': 'Meister-Buffs enden beim Aufheben',
  'fidelity.masterBuffCancel.hint':
    'Ein Meister- oder Rage-Fighter-Buff verschwindet, sobald der Server ihn aufhebt. Klassisch: er bleibt, bis sein Timer abläuft.',
  'fidelity.archangelFeathers': 'Erzengel-Federn',
  'fidelity.archangelFeathers.hint':
    'Die Erzengel in Blood Castle verlieren Federn und ihr Leuchten am Boden ist größer. Klassisch: das kleine Original-Leuchten, keine Federn.',
  'fidelity.loginChandeliers': 'Brennende Kronleuchter beim Login',
  'fidelity.loginChandeliers.hint':
    'Die Kronleuchter im Login-Bildschirm brennen. Klassisch: sie sind kalt, wie im Original.',
  'fidelity.torchCrackle': 'Fackelgeräusche',
  'fidelity.torchCrackle.hint':
    'Brennende Fackeln knistern, wenn du in der Nähe bist. Klassisch: Fackeln sind stumm.',
  'fidelity.loginWallTorches': 'Brennende Wandfackeln beim Login',
  'fidelity.loginWallTorches.hint':
    'Die Wandfackeln im Login-Bildschirm brennen mit Feuer und erhellen den Boden. Klassisch: nur ihr Schein, wie im Original.',
  'fidelity.fortressLights': 'Lichter der Kaiserfestung',
  'fidelity.fortressLights.hint':
    'Wandfackeln, Kronleuchter und Feuerschalen in der Kaiserfestung erhellen den Boden um sich. Klassisch: kein Licht, wie im Original.',
  'fidelity.lampFlares': 'Licht und Schein von Lampen',
  'fidelity.lampFlares.hint':
    'Straßenlaternen, Kerzen, Herdfeuer und Feuerschalen leuchten mit einem Schein, Kerzen brennen und manche Lampen und Feuer erhellen den Boden um sie herum. Klassisch: nur, was das Original zeichnet.',
  'fidelity.roofFade': 'Durchsichtige Dächer',
  'fidelity.roofFade.hint':
    'Dächer blenden aus, solange du darunter stehst, damit du hineinsiehst. Klassisch: Dächer bleiben immer sichtbar.',
  'fidelity.requestTimeout': 'Anfragen verfallen nach 20 s',
  'fidelity.requestTimeout.hint':
    'Eine Handels-, Gruppen- oder Duellanfrage, die du liegen lässt, wird nach 20 Sekunden abgelehnt. Klassisch: Sie wartet, bis du antwortest.',
  'fidelity.noticeLinks': 'Links in Servermeldungen',
  'fidelity.noticeLinks.hint':
    'Webadressen in den Servermeldungen sind unterstrichene Links, die einen neuen Tab öffnen. Klassisch: einfacher Text, wie im Original.',
} satisfies Partial<Record<keyof typeof en, string>>;
