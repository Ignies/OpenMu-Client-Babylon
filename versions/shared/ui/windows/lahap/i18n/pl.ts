/** Polish text of the `lahap` window. */

import type en from './en';

export default {
  'lahap.combineTitle': 'Łączenie klejnotów',
  'lahap.dismantleTitle': 'Rozdzielanie klejnotów',
  'lahap.menu1': 'Tutaj możesz łączyć lub rozdzielać',
  'lahap.menu2': 'różne klejnoty.',
  'lahap.close': 'Zamknij',
  'lahap.selectCombine': 'Wybierz klejnot do połączenia.',
  'lahap.combineCount': 'Połącz {count} (wymagane {zen} zen)',
  'lahap.cost': 'Koszt połączenia: {zen} zen',
  'lahap.selectDismantle': 'Wybierz klejnot do rozdzielenia.',
  'lahap.disband': 'Rozdziel',
  'lahap.disbandSure': 'Czy na pewno rozdzielić {name} {level}?',
  'lahap.dismantleCost': 'Koszt rozdzielenia: {zen} zen',
  'lahap.jewel.0': 'Klejnot Błogosławieństwa',
  'lahap.jewel.1': 'Klejnot Duszy',
  'lahap.jewel.2': 'Klejnot Życia',
  'lahap.jewel.3': 'Klejnot Stworzenia',
  'lahap.jewel.4': 'Klejnot Strażnika',
  'lahap.jewel.5': 'Kamień szlachetny',
  'lahap.jewel.6': 'Klejnot Harmonii',
  'lahap.jewel.7': 'Klejnot Chaosu',
  'lahap.jewel.8': 'Niższy kamień uszlachetniania',
  'lahap.jewel.9': 'Wyższy kamień uszlachetniania',
} satisfies Partial<Record<keyof typeof en, string>>;
