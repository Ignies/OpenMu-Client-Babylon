/** German text of the `pet_info` window. */

import type en from './en';

export default {
  'petInfo.title': 'Begleiter',
  'petInfo.darkHorse': 'Dark Horse',
  'petInfo.darkRaven': 'Dark Raven',
  'petInfo.notEquipped': '{pet} ist nicht ausgerüstet.',
  'petInfo.waiting': 'Warte auf die Daten des Begleiters...',
  'petInfo.level': 'Level {level}',
  'petInfo.life': 'Leben {current} / {max}',
  'petInfo.exp': 'Exp {current} / {next}',
  'petInfo.damage': 'Schaden {min}~{max} (Rate {rate})',
  'petInfo.attackSpeed': 'Angriffstempo {speed}',
  'petInfo.defense': 'Verteidigung {defense}',
  'petInfo.command': 'Befehl',
  'petInfo.cmdNormal': 'Normaler Angriff',
  'petInfo.cmdRandom': 'Zufälliger Angriff',
  'petInfo.cmdOwner': 'Mit dem Besitzer angreifen',
  'petInfo.cmdTarget': 'Ziel angreifen',
  'petInfo.close': 'Schließen',
} satisfies Partial<Record<keyof typeof en, string>>;
