/** cs text of `versions/shared/improvements`. */

import type en from './en';

export default {
  'fidelity.otherPlayersOwnSpeed': 'Ostatní hráči vlastní rychlostí',
  'fidelity.otherPlayersOwnSpeed.hint':
    'Ostatní hráči máchají zbraní a sesílají kouzla podle své vlastní rychlosti útoku a magie. Klasické: všichni se pohybují tvou rychlostí, jako v originálu.',
  'fidelity.masterBuffCancel': 'Mistrovská posílení končí zrušením',
  'fidelity.masterBuffCancel.hint':
    'Posílení mistra nebo Rage Fightera zmizí, jakmile ho server zruší. Klasické: zůstane, dokud mu nevyprší čas.',
  'fidelity.archangelFeathers': 'Peří archandělů',
  'fidelity.archangelFeathers.hint':
    'Archandělé v Blood Castle ztrácejí peří a jejich záře na zemi je širší. Klasické: malá původní záře, žádné peří.',
  'fidelity.loginChandeliers': 'Rozsvícené lustry na přihlášení',
  'fidelity.loginChandeliers.hint':
    'Lustry na přihlašovací obrazovce hoří. Klasické: jsou studené, jako v originálu.',
  'fidelity.torchCrackle': 'Zvuky pochodní',
  'fidelity.torchCrackle.hint':
    'Hořící pochodně praskají, když jsi poblíž. Klasické: pochodně jsou tiché.',
  'fidelity.loginWallTorches': 'Hořící nástěnné pochodně na přihlášení',
  'fidelity.loginWallTorches.hint':
    'Nástěnné pochodně na přihlašovací obrazovce hoří plamenem a osvětlují podlahu. Klasické: jen jejich záblesk, jako v originálu.',
  'fidelity.fortressLights': 'Světla Imperial Fortress',
  'fidelity.fortressLights.hint':
    'Nástěnné pochodně, lustry a ohniště v Imperial Fortress osvětlují podlahu kolem sebe. Klasické: žádné světlo, jako v originálu.',
  'fidelity.lampFlares': 'Světla a záblesky lamp',
  'fidelity.lampFlares.hint':
    'Pouliční lampy, svíčky, krby a ohniště září zábleskem, svíčky hoří a některé lampy a ohně osvětlují podlahu kolem sebe. Klasické: jen to, co kreslí originál.',
  'fidelity.roofFade': 'Průhledné střechy',
  'fidelity.roofFade.hint':
    'Střechy zmizí, když pod nimi stojíš, takže vidíš dovnitř. Klasické: střechy se vždy vykreslují.',
  'fidelity.openRooms': 'Otevřené místnosti',
  'fidelity.openRooms.hint':
    'Uvnitř místnosti zůstává město kolem ní vidět, místo aby zčernalo. Klasické: vše mimo místnost je černé.',
  'fidelity.requestTimeout': 'Žádosti vyprší po 20 s',
  'fidelity.requestTimeout.hint':
    'Žádost o obchod, družinu nebo souboj, kterou necháš bez odpovědi, se po 20 sekundách odmítne. Klasické: čeká, dokud neodpovíš.',
  'fidelity.noticeLinks': 'Odkazy v oznámeních serveru',
  'fidelity.noticeLinks.hint':
    'Webové adresy v oznámeních serveru jsou podtržené odkazy, které otevřou novou kartu. Klasické: prostý text, jako v originálu.',
  'fidelity.cameraKeepsView': 'Kamera zůstává po přesunu',
  'fidelity.cameraKeepsView.hint':
    'Přiblížení, otočení a sklon kamery zůstanou stejné, když se přeneseš nebo změníš mapu, a když je pohled posunutý, zobrazí se tlačítko Resetovat kameru. Klasické: každá změna mapy kameru resetuje, jako v originálu.',
  'fidelity.swingFill': 'Máchnutí vyplní čas mezi zásahy',
  'fidelity.swingFill.hint':
    'Při vysoké rychlosti útoku se část máchnutí po úderu přehraje pomaleji, aby trvala až do dalšího máchnutí, místo aby hrdina mezi nimi ztuhl. Zásahy dopadnou ve stejnou chvíli. Klasické: máchnutí skončí brzy a hrdina stojí, jako v originálu.',
  'fidelity.drawnClothShadows': 'Úhledné stíny látek',
  'fidelity.drawnClothShadows.hint':
    'Stín vrhají jen pláště, róby a vlasy, které postava ukazuje. Klasické: látka, kterou postava už neukazuje, stále nechává svůj stín tam, kde zůstala, jako v originálu.',
  'fidelity.loginTokens': 'Uložená přihlášení',
  'fidelity.loginTokens.hint':
    'Na světech, které to nabízejí, si "Zapamatovat si mě" uloží místo hesla přihlašovací token, takže příští přihlášení heslo nepotřebuje. Klasické: heslo zadáváš pokaždé, jako v originálu.',
  'fidelity.teleportLandsEarly': 'Teleport dopadne hned',
  'fidelity.teleportLandsEarly.hint':
    'Tvůj vlastní Teleport dopadne na pole, jakmile zmizíš, bez čekání na odpověď serveru. Klasické: zůstaneš zmizelý na starém poli, dokud server neodpoví, jako v originálu.',
  'fidelity.soccerBoardClock': 'Hodiny fotbalu na tabuli',
  'fidelity.soccerBoardClock.hint':
    'Čas Battle Soccer se zobrazuje jako hodiny na výsledkové tabuli místo řádku uprostřed obrazovky. Klasické: zbývající čas je napsán uprostřed obrazovky, jako v originálu.',
  'fidelity.enhancedSkillEffects': 'Vylepšené efekty dovedností',
  'fidelity.enhancedSkillEffects.hint':
    'Některé dovednosti se kreslí naším vlastním vzhledem, třeba roj Evil Spirit s kouřem a závojem. Totéž co volba Efekty dovedností. Klasické: každá dovednost se kreslí jako v originálu.',
  'fidelity.restAnyWall': 'Opření o jakoukoli zeď',
  'fidelity.restAnyWall.hint':
    'Klikni na rovnou zeď nebo plot a tvůj hrdina k ní dojde a opře se o ni, jako na místech k opření. Klasické: opřít se můžeš jen na místech, která určuje mapa, jako v originálu.',
} satisfies Partial<Record<keyof typeof en, string>>;
