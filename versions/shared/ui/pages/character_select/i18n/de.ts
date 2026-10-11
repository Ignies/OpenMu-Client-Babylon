/** German text of the `character_select` page. */

import type en from './en';

export default {
  'characters.loading': 'Charaktere werden geladen...',
  'characters.select': 'Wähle einen Charakter',
  'characters.hint.select': 'Auswählen',
  'characters.hint.zoomIn': 'Heranzoomen',
  'characters.hint.zoomOut': 'Herauszoomen',
  'class.desc.darkWizard':
    'Reich der Magier, Nachfahre von Arka. Körperlich unterlegen, aber von enormer Kraft; er beherrscht Angriffszauber mühelos.',
  'class.desc.darkKnight':
    'Reich der Ritter, Nachfahre von Lorencia. Mit großer Kraft und Schwertkunst führt er fast jede Nahkampfwaffe.',
  'class.desc.elf':
    'Reich der Elfen, Nachfahre von Noria. Meister von Pfeil und Bogen, der auch verschiedene Zauber beherrscht.',
  'class.desc.summoner':
    'Starker Geist und ausgezeichneter Instinkt erzeugen den mächtigsten Fluchzauber. Sie zieht auch Beschwörer aus einer anderen Welt herbei und wendet ihre schädliche Zauberei gegen sie.',
  'class.desc.rageFighter':
    'Rechtmäßige Erben der Königlichen Ritter von Karutan und Kampfkünstler von großer körperlicher Stärke. Sie unterstützen die Gruppe zudem mit Segen.',
  'class.desc.magicGladiator':
    'Mischcharakter mit Zügen des Dark Knight und des Dark Wizard. Meister des Nahkampfs, der zugleich frei zaubert.',
  'class.desc.darkLord':
    'Charismatischer Charakter, der Truppen befehligt und den dunklen Geist sowie das dunkle Pferd beherrscht.',
} satisfies Partial<Record<keyof typeof en, string>>;
