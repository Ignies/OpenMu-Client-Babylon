/** Polish text of the improvements. */

import type en from './en';

export default {
  'fidelity.otherPlayersOwnSpeed': 'Inni gracze we własnym tempie',
  'fidelity.otherPlayersOwnSpeed.hint':
    'Inni gracze atakują i rzucają czary z własną szybkością. Klasyczne: wszyscy ruszają się w twoim tempie, jak w oryginale.',
  'fidelity.masterBuffCancel': 'Buffy mistrzowskie znikają po anulowaniu',
  'fidelity.masterBuffCancel.hint':
    'Buff mistrzowski lub Rage Fightera znika, gdy serwer go anuluje. Klasyczne: trwa, aż skończy się jego czas.',
  'fidelity.archangelFeathers': 'Pióra archaniołów',
  'fidelity.archangelFeathers.hint':
    'Archanioły w Blood Castle gubią pióra, a ich blask na ziemi jest szerszy. Klasyczne: mały oryginalny blask, bez piór.',
  'fidelity.loginChandeliers': 'Zapalone żyrandole przy logowaniu',
  'fidelity.loginChandeliers.hint':
    'Żyrandole na ekranie logowania płoną. Klasyczne: są zgaszone, jak w oryginale.',
  'fidelity.torchCrackle': 'Odgłos pochodni',
  'fidelity.torchCrackle.hint':
    'Płonące pochodnie trzaskają, gdy jesteś blisko. Klasyczne: pochodnie są ciche.',
  'fidelity.loginWallTorches': 'Płonące pochodnie przy logowaniu',
  'fidelity.loginWallTorches.hint':
    'Pochodnie na ścianach ekranu logowania płoną ogniem i oświetlają podłogę. Klasyczne: tylko ich blask, jak w oryginale.',
  'fidelity.fortressLights': 'Światła Cesarskiej Twierdzy',
  'fidelity.fortressLights.hint':
    'Pochodnie, żyrandole i paleniska w Cesarskiej Twierdzy oświetlają podłogę wokół. Klasyczne: brak światła, jak w oryginale.',
  'fidelity.lampFlares': 'Światło i blask lamp',
  'fidelity.lampFlares.hint':
    'Latarnie, świece, kominki i paleniska świecą blaskiem, świece płoną, a niektóre lampy i ognie oświetlają podłogę wokół siebie. Klasyczne: tylko to, co rysuje oryginał.',
  'fidelity.roofFade': 'Przezroczyste dachy',
  'fidelity.roofFade.hint':
    'Dachy znikają, gdy stoisz pod nimi, więc widzisz wnętrze. Klasyczne: dachy są zawsze widoczne.',
  'fidelity.openRooms': 'Otwarte pokoje',
  'fidelity.openRooms.hint':
    'W pokoju miasto wokół pozostaje widoczne zamiast robić się czarne. Klasyczne: wszystko poza pokojem jest czarne.',
  'fidelity.requestTimeout': 'Prośby wygasają po 20 s',
  'fidelity.requestTimeout.hint':
    'Prośba o handel, drużynę lub pojedynek bez odpowiedzi jest odrzucana po 20 sekundach. Klasyczne: czeka, aż odpowiesz.',
  'fidelity.noticeLinks': 'Linki w ogłoszeniach serwera',
  'fidelity.noticeLinks.hint':
    'Adresy WWW w ogłoszeniach serwera są podkreślonymi linkami otwieranymi w nowej karcie. Klasyczne: zwykły tekst, jak w oryginale.',
  'fidelity.cameraKeepsView': 'Kamera zachowana po teleportacji',
  'fidelity.cameraKeepsView.hint':
    'Przybliżenie, obrót i nachylenie kamery zostają takie same po teleportacji lub zmianie mapy, a przycisk Resetuj kamerę pojawia się, gdy widok jest przesunięty. Klasyczne: każda zmiana mapy resetuje kamerę, jak w oryginale.',
  'fidelity.swingFill': 'Ciosy wypełniają czas między nimi',
  'fidelity.swingFill.hint':
    'Przy dużej szybkości ataku część ciosu po trafieniu jest odtwarzana wolniej, aby trwała do następnego ciosu, zamiast bohater zastygał pomiędzy. Trafienia padają w tej samej chwili. Klasyczne: cios kończy się wcześnie, a bohater stoi, jak w oryginale.',
  'fidelity.drawnClothShadows': 'Uporządkowane cienie tkanin',
  'fidelity.drawnClothShadows.hint':
    'Cień rzucają tylko peleryny, szaty i włosy, które postać pokazuje. Klasyczne: tkanina, której postać już nie pokazuje, nadal rzuca cień tam, gdzie została, jak w oryginale.',
  'fidelity.loginTokens': 'Zapisane logowania',
  'fidelity.loginTokens.hint':
    'Na światach, które to oferują, „Zapamiętaj mnie” przechowuje token logowania zamiast hasła, więc kolejne logowanie nie wymaga hasła. Klasyczne: hasło wpisujesz za każdym razem, jak w oryginale.',
  'fidelity.teleportLandsEarly': 'Teleport ląduje od razu',
  'fidelity.teleportLandsEarly.hint':
    'Twój Teleport stawia cię na polu, gdy tylko znikniesz, bez czekania na odpowiedź serwera. Klasyczne: pozostajesz niewidoczny na starym polu, aż serwer odpowie, jak w oryginale.',
  'fidelity.soccerBoardClock':
    'Zegar piłkarski na tablicy',
  'fidelity.soccerBoardClock.hint':
    'Czas Battle Soccer jest pokazywany jako zegar na tablicy wyników zamiast wiersza na środku ekranu. Klasyczne: pozostały czas jest wypisany na środku ekranu, jak w oryginale.',
  'fidelity.enhancedSkillEffects': 'Ulepszone efekty umiejętności',
  'fidelity.enhancedSkillEffects.hint':
    'Niektóre umiejętności są rysowane w naszym własnym wyglądzie, na przykład rój Evil Spirit z dymem i całunem. Także opcja Efekty umiejętności. Klasyczne: każda umiejętność wygląda jak w oryginale.',
  'fidelity.restAnyWall': 'Opieranie o każdą ścianę',
  'fidelity.restAnyWall.hint':
    'Kliknij prostą ścianę lub płot, a bohater podejdzie i oprze się o nie, jak w miejscach do opierania. Klasyczny: możesz opierać się tylko w miejscach, które stawia mapa, jak w oryginale.',
} satisfies Partial<Record<keyof typeof en, string>>;
