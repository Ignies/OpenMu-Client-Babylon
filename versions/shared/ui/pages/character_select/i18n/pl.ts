/** Polish text of the `character_select` page. */

import type en from './en';

export default {
  'characters.loading': 'Wczytywanie postaci...',
  'characters.select': 'Wybierz postać',
  'characters.hint.select': 'Wybierz',
  'characters.hint.zoomIn': 'Przybliż',
  'characters.hint.zoomOut': 'Oddal',
  'class.desc.darkWizard':
    'Królestwo magów, potomek Arki. Ma słabą kondycję fizyczną, ale ogromną moc i swobodnie włada zaklęciami ataku.',
  'class.desc.darkKnight':
    'Królestwo rycerzy, potomek Lorencii. Dzięki wielkiej sile i szermierce włada większością broni do walki wręcz.',
  'class.desc.elf':
    'Królestwo elfów, potomkini Norii. Mistrzyni łuku i strzał, włada też różnymi zaklęciami.',
  'class.desc.summoner':
    'Silny umysł i niezwykła intuicja tworzą najpotężniejsze zaklęcia klątwy. Przyzywa też przywoływaczy z innego świata i obraca przeciw nim zgubne czary.',
  'class.desc.rageFighter':
    'Prawowici spadkobiercy Królewskich Rycerzy Karutanu i mistrzowie sztuk walki o wielkiej sile fizycznej. Wspierają też drużynę wzmocnieniami.',
  'class.desc.magicGladiator':
    'Złożona postać łącząca cechy Dark Knighta i Dark Wizarda. Mistrz walki wręcz, który swobodnie włada zaklęciami.',
  'class.desc.darkLord':
    'Charyzmatyczna postać, która dowodzi wojskami i włada Dark Spiritem oraz Dark Horse\'em.',
} satisfies Partial<Record<keyof typeof en, string>>;
