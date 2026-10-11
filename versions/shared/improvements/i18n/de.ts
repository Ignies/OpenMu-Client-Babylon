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
  'fidelity.cameraKeepsView': 'Kamera bleibt beim Kartenwechsel',
  'fidelity.cameraKeepsView.hint':
    'Zoom, Drehung und Neigung der Kamera bleiben erhalten, wenn du dich teleportierst oder die Karte wechselst, und eine Schaltfläche „Kamera zurücksetzen“ erscheint, solange die Ansicht verstellt ist. Klassisch: Jeder Kartenwechsel setzt die Kamera zurück, wie im Original.',
  'fidelity.swingFill': 'Schläge füllen die Zeit dazwischen',
  'fidelity.swingFill.hint':
    'Bei hohem Angriffstempo läuft der Teil deines Schlags nach dem Treffer langsamer, sodass er bis zum nächsten Schlag dauert, statt dass der Held dazwischen erstarrt. Treffer landen im selben Moment. Klassisch: Der Schlag endet früh und der Held steht still, wie im Original.',
  'fidelity.drawnClothShadows': 'Aufgeräumte Stoffschatten',
  'fidelity.drawnClothShadows.hint':
    'Nur Umhänge, Roben und Haare, die eine Figur zeigt, werfen einen Schatten. Klassisch: Ein Stoff, den die Figur nicht mehr zeigt, wirft seinen Schatten weiter dort, wo er zurückblieb, wie im Original.',
  'fidelity.loginTokens': 'Gespeicherte Anmeldungen',
  'fidelity.loginTokens.hint':
    'Auf Welten, die es anbieten, behält „Angemeldet bleiben“ ein Anmelde-Token statt deines Passworts, sodass die nächste Anmeldung kein Passwort braucht. Klassisch: Du gibst das Passwort jedes Mal ein, wie im Original.',
} satisfies Partial<Record<keyof typeof en, string>>;
