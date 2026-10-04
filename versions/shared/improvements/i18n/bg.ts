/** Bulgarian text of the improvements. */

import type en from './en';

export default {
  'fidelity.otherPlayersOwnSpeed': 'Другите играчи със своя скорост',
  'fidelity.otherPlayersOwnSpeed.hint':
    'Другите играчи удрят и правят магии със своята скорост на атака и магия. Класическо: всички се движат с вашата скорост, както в оригинала.',
  'fidelity.masterBuffCancel': 'Мастър бафовете спират при отмяна',
  'fidelity.masterBuffCancel.hint':
    'Мастър баф или баф на Rage Fighter изчезва веднага щом сървърът го отмени. Класическо: остава, докато изтече таймерът му.',
  'fidelity.archangelFeathers': 'Пера на архангелите',
  'fidelity.archangelFeathers.hint':
    'Архангелите в Blood Castle ронят пера, а сиянието им по земята е по-широко. Класическо: малкото оригинално сияние, без пера.',
  'fidelity.loginChandeliers': 'Запалени полилеи при вход',
  'fidelity.loginChandeliers.hint':
    'Полилеите на екрана за вход горят. Класическо: угаснали са, както в оригинала.',
  'fidelity.wingShadows': 'Сенки на крилете',
  'fidelity.wingShadows.hint':
    'Крилете хвърлят сянка. Класическо: без сянка, както в оригинала.',
  'fidelity.torchCrackle': 'Звук на факлите',
  'fidelity.torchCrackle.hint':
    'Горящите факли пращят, когато сте наблизо. Класическо: факлите са беззвучни.',
} satisfies Partial<Record<keyof typeof en, string>>;
