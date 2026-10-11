/** Italian text of the improvements. */

import type en from './en';

export default {
  'fidelity.otherPlayersOwnSpeed': 'Altri giocatori alla loro velocità',
  'fidelity.otherPlayersOwnSpeed.hint':
    'Gli altri giocatori attaccano e lanciano magie alla propria velocità. Classica: tutti si muovono alla tua velocità, come nell\'originale.',
  'fidelity.masterBuffCancel': 'I buff maestro finiscono se annullati',
  'fidelity.masterBuffCancel.hint':
    'Un buff maestro o del Rage Fighter sparisce appena il server lo annulla. Classica: resta finché non scade il suo timer.',
  'fidelity.archangelFeathers': 'Piume degli arcangeli',
  'fidelity.archangelFeathers.hint':
    'Gli arcangeli di Blood Castle perdono piume e il loro bagliore a terra è più ampio. Classica: il piccolo bagliore originale, senza piume.',
  'fidelity.loginChandeliers': 'Lampadari accesi al login',
  'fidelity.loginChandeliers.hint':
    'I lampadari della schermata di accesso sono accesi. Classica: sono spenti, come nell\'originale.',
  'fidelity.torchCrackle': 'Suono delle torce',
  'fidelity.torchCrackle.hint':
    'Le torce accese crepitano quando sei vicino. Classica: le torce sono silenziose.',
  'fidelity.loginWallTorches': 'Torce a muro accese al login',
  'fidelity.loginWallTorches.hint':
    'Le torce a muro della schermata di accesso bruciano e illuminano il pavimento. Classica: solo il loro bagliore, come nell\'originale.',
  'fidelity.fortressLights': 'Luci della Fortezza Imperiale',
  'fidelity.fortressLights.hint':
    'Torce, lampadari e bracieri della Fortezza Imperiale illuminano il pavimento intorno. Classica: nessuna luce, come nell\'originale.',
  'fidelity.lampFlares': 'Luci e bagliori delle lampade',
  'fidelity.lampFlares.hint':
    'Lampioni, candele, focolari e bracieri brillano di un bagliore, le candele bruciano e alcune lampade e alcuni fuochi illuminano il terreno intorno. Classica: solo ciò che disegna l\'originale.',
  'fidelity.roofFade': 'Tetti trasparenti',
  'fidelity.roofFade.hint':
    'I tetti svaniscono mentre ci sei sotto, così vedi l\'interno. Classica: i tetti restano sempre visibili.',
  'fidelity.requestTimeout': 'Le richieste scadono dopo 20 s',
  'fidelity.requestTimeout.hint':
    'Una richiesta di scambio, gruppo o duello lasciata senza risposta viene rifiutata dopo 20 secondi. Classica: aspetta la tua risposta.',
  'fidelity.noticeLinks': 'Link negli avvisi del server',
  'fidelity.noticeLinks.hint':
    'Gli indirizzi web negli avvisi del server sono link sottolineati che aprono una nuova scheda. Classica: testo semplice, come nell’originale.',
  'fidelity.cameraKeepsView': 'Telecamera mantenuta tra le mappe',
  'fidelity.cameraKeepsView.hint':
    'Zoom, rotazione e inclinazione della telecamera restano uguali quando ti teletrasporti o cambi mappa, e un pulsante Reimposta telecamera appare finché la visuale è spostata. Classica: ogni cambio di mappa reimposta la telecamera, come nell’originale.',
  'fidelity.swingFill': 'I colpi riempiono il tempo tra uno e l’altro',
  'fidelity.swingFill.hint':
    'Con un’alta velocità d’attacco, la parte del colpo dopo l’impatto viene riprodotta più lenta per durare fino al colpo successivo, invece di lasciare l’eroe fermo nel mezzo. I colpi arrivano nello stesso momento. Classica: il colpo finisce presto e l’eroe resta fermo, come nell’originale.',
  'fidelity.drawnClothShadows': 'Ombre dei tessuti ordinate',
  'fidelity.drawnClothShadows.hint':
    'Solo i mantelli, le tuniche e i capelli che un personaggio mostra proiettano un’ombra. Classica: un tessuto che il personaggio non mostra più lascia la sua ombra dove è rimasto, come nell’originale.',
  'fidelity.loginTokens': 'Accessi salvati',
  'fidelity.loginTokens.hint':
    'Nei mondi che lo offrono, «Ricordami» conserva un token di accesso al posto della password, così l’accesso successivo non la chiede. Classica: scrivi la password ogni volta, come nell’originale.',
} satisfies Partial<Record<keyof typeof en, string>>;
