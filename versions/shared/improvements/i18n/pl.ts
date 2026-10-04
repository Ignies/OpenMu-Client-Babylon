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
  'fidelity.wingShadows': 'Cienie skrzydeł',
  'fidelity.wingShadows.hint':
    'Skrzydła rzucają cień. Klasyczne: bez cienia, jak w oryginale.',
  'fidelity.torchCrackle': 'Odgłos pochodni',
  'fidelity.torchCrackle.hint':
    'Płonące pochodnie trzaskają, gdy jesteś blisko. Klasyczne: pochodnie są ciche.',
} satisfies Partial<Record<keyof typeof en, string>>;
