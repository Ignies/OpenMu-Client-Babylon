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
  'fidelity.wingShadows': 'Ombre delle ali',
  'fidelity.wingShadows.hint':
    'Le ali proiettano un\'ombra. Classica: nessuna ombra, come nell\'originale.',
  'fidelity.torchCrackle': 'Suono delle torce',
  'fidelity.torchCrackle.hint':
    'Le torce accese crepitano quando sei vicino. Classica: le torce sono silenziose.',
} satisfies Partial<Record<keyof typeof en, string>>;
